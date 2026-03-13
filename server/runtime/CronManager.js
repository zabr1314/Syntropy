import fs from 'fs';
import path from 'path';
import cron from 'node-cron';

/**
 * CronManager - Manages scheduled tasks for Agents.
 * Inspired by OpenClaw's distributed Cron system.
 */
export class CronManager {
    constructor(kernel, dataDir = './data/cron') {
        this.kernel = kernel;
        this.dataDir = dataDir;
        this.jobsFile = path.join(dataDir, 'jobs.json');
        this.jobs = new Map(); // Store active cron jobs (node-cron tasks)
        this.configs = new Map(); // Store job configurations

        // Ensure directory exists
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        this.loadJobs();
    }

    /**
     * Load jobs from disk and schedule them.
     */
    loadJobs() {
        if (!fs.existsSync(this.jobsFile)) {
            return;
        }

        try {
            const data = fs.readFileSync(this.jobsFile, 'utf-8');
            const jobs = JSON.parse(data);
            
            for (const job of jobs) {
                this.schedule(job);
            }
            console.log(`[CronManager] Loaded ${jobs.length} jobs.`);
        } catch (err) {
            console.error('[CronManager] Failed to load jobs:', err);
        }
    }

    /**
     * Save current jobs to disk.
     */
    saveJobs() {
        const jobs = Array.from(this.configs.values());
        fs.writeFileSync(this.jobsFile, JSON.stringify(jobs, null, 2));
    }

    /**
     * Schedule a new job or update an existing one.
     * @param {Object} jobConfig
     * @param {string} jobConfig.id - Unique ID
     * @param {string} jobConfig.name - Display Name
     * @param {string} jobConfig.schedule - Cron expression or 'at' time
     * @param {string} jobConfig.agentId - Target Agent ID
     * @param {string} jobConfig.message - Message/Task to send to the agent
     * @param {boolean} jobConfig.enabled - Whether the job is active
     */
    schedule(jobConfig) {
        // Validation
        if (!jobConfig.id || !jobConfig.schedule || !jobConfig.agentId) {
            throw new Error('Invalid job configuration');
        }

        // Stop existing job if updating
        if (this.jobs.has(jobConfig.id)) {
            this.jobs.get(jobConfig.id).stop();
            this.jobs.delete(jobConfig.id);
        }

        this.configs.set(jobConfig.id, jobConfig);

        if (jobConfig.enabled !== false) {
            try {
                // Check if it's a valid cron expression
                if (cron.validate(jobConfig.schedule)) {
                    const task = cron.schedule(jobConfig.schedule, () => {
                        this.executeJob(jobConfig);
                    });
                    this.jobs.set(jobConfig.id, task);
                    console.log(`[CronManager] Scheduled job: ${jobConfig.name} (${jobConfig.id})`);
                } else {
                    console.warn(`[CronManager] Invalid cron expression for job ${jobConfig.id}: ${jobConfig.schedule}`);
                }
            } catch (err) {
                console.error(`[CronManager] Failed to schedule job ${jobConfig.id}:`, err);
            }
        }

        this.saveJobs();
    }

    /**
     * Execute a job immediately.
     */
    async executeJob(jobConfig) {
        console.log(`[CronManager] Executing job: ${jobConfig.name} (${jobConfig.id})`);
        
        const agent = this.kernel.getAgent(jobConfig.agentId);
        if (!agent) {
            console.warn(`[CronManager] Agent ${jobConfig.agentId} not found for job ${jobConfig.id}`);
            return;
        }

        try {
            // Trigger agent execution
            // We inject a special context or prefix to indicate it's a scheduled task
            const input = `[System Event: Scheduled Task] ${jobConfig.message}`;
            await agent.execute(input);
            console.log(`[CronManager] Job ${jobConfig.id} completed successfully.`);
        } catch (err) {
            console.error(`[CronManager] Job ${jobConfig.id} failed:`, err);
        }
    }

    /**
     * Remove a job.
     */
    removeJob(jobId) {
        if (this.jobs.has(jobId)) {
            this.jobs.get(jobId).stop();
            this.jobs.delete(jobId);
        }
        this.configs.delete(jobId);
        this.saveJobs();
        console.log(`[CronManager] Removed job: ${jobId}`);
    }

    /**
     * List all jobs.
     */
    listJobs() {
        return Array.from(this.configs.values());
    }
}
