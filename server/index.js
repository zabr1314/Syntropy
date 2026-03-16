import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs';
import multer from 'multer'; // Import multer

// New Core Imports
import { Kernel } from './core/Kernel.js';
import { SkillManager } from './runtime/SkillManager.js';
import { SocketGateway } from './runtime/SocketGateway.js';
import { SessionStore } from './infra/SessionStore.js';
import { Storage } from './infra/Storage.js';
import { Logger } from './infra/Logger.js';

// Setup Express
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());

import { ConfigManager } from './runtime/ConfigManager.js';

// --- BOOTSTRAP SYSTEM ---

// 1. Infrastructure
const storage = new Storage({ path: './data' });
const sessionStore = new SessionStore('./data/sessions.db');
const logger = new Logger(storage);
const configManager = new ConfigManager(); // Initialize Config Manager

// 2. Core Kernel (no longer owns Socket.io)
const kernel = new Kernel(sessionStore);

// 3. Runtime Services
const skillManager = new SkillManager();
kernel.skillManager = skillManager;

// 4. Socket Gateway — owns all Socket.io concerns
const gateway = new SocketGateway(io, kernel);

// 4. Load Skills (Capabilities)
const skillsDir = path.join(process.cwd(), 'skills');
skillManager.loadSkills(skillsDir).then(() => {
    logger.info('System', 'Skills loaded');
});

// 5. Load Agents (Business Logic)
async function loadAgents() {
    try {
        const configData = configManager.getAll();
        
        if (Object.keys(configData).length === 0) {
            logger.info('System', 'No agent config found, skipping agent load');
            return;
        }
        
        const { Agent } = await import('./core/Agent.js');

        for (const [id, config] of Object.entries(configData)) {
            // Ensure ID is set from key if missing in object
            if (!config.id) config.id = id;
            
            const agentInstance = new Agent(config);
            kernel.registerAgent(agentInstance);
        }
        logger.info('System', `Loaded ${kernel.agents.size} agents with OpenClaw architecture`);
    } catch (error) {
        logger.error('System', 'Failed to load agents', error);
    }
}

loadAgents();

// Health Check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    architecture: 'v2.0-macro',
    agents: Array.from(kernel.agents.keys()),
    skills: Array.from(skillManager.skills.keys())
  });
});

// Officials Registry API
app.get('/api/officials', (req, res) => {
    const officials = Array.from(kernel.agents.values()).map(agent => ({
        id: agent.id,
        name: agent.name,
        description: agent.description,
        status: agent.status,
        lastMessage: agent.lastMessage,
        identity: agent.identity,
        model: agent.modelConfig,
        systemPrompt: agent.systemPrompt,
        tools: agent.tools,
        skills: agent.skillsFilter
    }));
    res.json(officials);
});

// Skills API
app.get('/api/skills', (req, res) => {
    const skills = skillManager.getAllDefinitions().map(s => ({
        name: s.name,
        description: s.description,
        riskLevel: skillManager.getSkill(s.name)?.riskLevel || 'low'
    }));
    res.json(skills);
});

// Update Agent Config API (Hot Reload)
app.patch('/api/agents/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    
    try {
        // 1. Update Persistent Config
        configManager.update(id, updates);
        
        // 2. Update Runtime Agent
        const agent = kernel.getAgent(id);
        if (agent) {
            agent.updateConfig(updates);
            logger.info('System', `Hot-reloaded configuration for agent ${id}`);
            res.json({ success: true, message: 'Configuration updated and hot-reloaded' });
        } else {
            // If agent doesn't exist in runtime but was just added to config, we should create it?
            // For now, assume we only patch existing agents.
            res.status(404).json({ error: 'Agent runtime instance not found' });
        }
    } catch (error) {
        logger.error('System', `Failed to update agent ${id}`, error);
        res.status(500).json({ error: error.message });
    }
});

// Create Agent API
app.post('/api/agents', async (req, res) => {
    try {
        const { id, name, systemPrompt, description, model, workspace, skills } = req.body;
        if (!id || !name) {
            return res.status(400).json({ error: 'ID and Name are required' });
        }

        const config = {
            id,
            name,
            description,
            system_prompt: systemPrompt,
            model: model || { primary: 'deepseek-chat' },
            workspace,
            skills: skills || ['*']
        };

        // 1. Persist Config
        configManager.update(id, config);

        // 2. Create Runtime Instance
        const { Agent } = await import('./core/Agent.js');
        const agentInstance = new Agent(config);
        kernel.registerAgent(agentInstance);

        res.status(201).json({ success: true, id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete Agent API
app.delete('/api/agents/:id', (req, res) => {
    const { id } = req.params;
    const success = kernel.unregisterAgent(id);
    if (success) {
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Agent not found' });
    }
});

// --- File Management APIs ---

// Configure Multer for File Uploads
const upload = multer({
    dest: 'temp_uploads/', // Temporary directory
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB Limit
});

// List Files
app.get('/api/agents/:id/files', (req, res) => {
    const { id } = req.params;
    const agent = kernel.getAgent(id);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    const workspace = agent.workspace;
    
    fs.readdir(workspace, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read workspace' });
        }
        
        const fileList = files.map(file => {
            const filePath = path.join(workspace, file);
            const stats = fs.statSync(filePath);
            return {
                name: file,
                size: stats.size,
                createdAt: stats.birthtime
            };
        });
        
        res.json(fileList);
    });
});

// Upload File
app.post('/api/agents/:id/files', upload.single('file'), (req, res) => {
    const { id } = req.params;
    const agent = kernel.getAgent(id);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const targetPath = path.join(agent.workspace, req.file.originalname);
    
    fs.rename(req.file.path, targetPath, (err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to save file' });
        }
        res.json({ success: true, filename: req.file.originalname });
    });
});

// Delete File
app.delete('/api/agents/:id/files/:filename', (req, res) => {
    const { id, filename } = req.params;
    const agent = kernel.getAgent(id);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    // Security check: Prevent directory traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join(agent.workspace, safeFilename);
    
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'File not found' });
    }
});

// --- Debugging APIs ---

// Memory Management APIs
app.get('/api/memory', (req, res) => {
    try {
        const allMemories = [];

        for (const agent of kernel.agents.values()) {
            if (!agent.memory) continue;

            // Only fetch intentional memories, not conversation history
            const memories = agent.memory.db.prepare(`
                SELECT id, content, role, metadata, created_at
                FROM chunks
                WHERE role = 'user_preference'
                ORDER BY created_at DESC
            `).all();

            memories.forEach(mem => {
                allMemories.push({
                    id: mem.id,
                    content: mem.content,
                    source: agent.id,
                    role: mem.role,
                    metadata: mem.metadata ? JSON.parse(mem.metadata) : {},
                    timestamp: mem.created_at
                });
            });
        }

        res.json(allMemories);
    } catch (error) {
        logger.error('API', 'Failed to fetch memories', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/memory', async (req, res) => {
    try {
        const { content, source, role = 'user_preference', metadata = {} } = req.body;

        if (!content || !source) {
            return res.status(400).json({ error: 'content and source are required' });
        }

        const agent = kernel.getAgent(source);
        if (!agent || !agent.memory) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        const id = `manual_${Date.now()}`;
        await agent.memory.save(id, content, role, metadata);

        res.json({ success: true, id });
    } catch (error) {
        logger.error('API', 'Failed to create memory', error);
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/memory/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { content, source } = req.body;

        if (!content || !source) {
            return res.status(400).json({ error: 'content and source are required' });
        }

        const agent = kernel.getAgent(source);
        if (!agent || !agent.memory) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        agent.memory.db.prepare(`
            UPDATE chunks SET content = ? WHERE id = ?
        `).run(content, id);

        res.json({ success: true });
    } catch (error) {
        logger.error('API', 'Failed to update memory', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/memory/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { source } = req.query;

        if (!source) {
            return res.status(400).json({ error: 'source query param is required' });
        }

        const agent = kernel.getAgent(source);
        if (!agent || !agent.memory) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        agent.memory.db.prepare(`DELETE FROM chunks WHERE id = ?`).run(id);

        res.json({ success: true });
    } catch (error) {
        logger.error('API', 'Failed to delete memory', error);
        res.status(500).json({ error: error.message });
    }
});

// RAG Debug Endpoint
app.post('/api/agent/:id/memory/debug', async (req, res) => {
    const { id } = req.params;
    const { query, limit = 10 } = req.body;
    
    const agent = kernel.getAgent(id);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    
    try {
        const results = await agent.memory.search(query, { 
            limit, 
            useVector: true, 
            debug: true // Enable debug info
        });
        
        res.json({
            agentId: id,
            query,
            results
        });
    } catch (error) {
        logger.error('API', `RAG debug failed for agent ${id}`, error);
        res.status(500).json({ error: error.message });
    }
});

httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[Server] Port ${PORT} is already in use. Run: lsof -ti:${PORT} | xargs kill -9`);
  } else {
    console.error('[Server] HTTP server error:', err);
  }
  process.exit(1);
});

httpServer.listen(PORT, () => {
  console.log(`Destiny System (Macro Architecture) running at http://localhost:${PORT}`);
});
