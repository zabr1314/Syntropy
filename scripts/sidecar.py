import sys
import time
import re
import json
import argparse
import os
import urllib.request
import urllib.error
from datetime import datetime

# 默认配置
DEFAULT_API_URL = "http://localhost:3001/api/report"
DEFAULT_LOG_FILE = "openclaw.log"
DEFAULT_AGENT_ID = "python-sidecar-01"

# 状态映射模式 (正则 -> 状态)
PATTERNS = [
    (r"\[THINKING\]", "working"),
    (r"\[EXECUTING\]", "working"),
    (r"\[WRITING\]", "working"),
    (r"\[RESEARCHING\]", "working"),
    (r"\[ERROR\]", "error"),
    (r"\[FATAL\]", "error"),
    (r"\[WAITING\]", "idle"),
    (r"\[IDLE\]", "idle"),
    (r"\[DONE\]", "idle"),
]

def parse_line(line):
    """解析日志行，返回 (status, content)"""
    line = line.strip()
    if not line:
        return None, None
    
    for pattern, status in PATTERNS:
        if re.search(pattern, line, re.IGNORECASE):
            return status, line
    return None, None

def send_report(url, agent_id, status, current_task):
    """发送状态到 State Hub"""
    payload = {
        "instance_id": agent_id,
        "status": status,
        "current_task": current_task,
        "timestamp": int(time.time() * 1000)
    }
    
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status == 200:
                # print(f"[Sidecar] Reported: {status} - {current_task[:30]}...")
                return True
            else:
                print(f"[Sidecar] Error reporting: HTTP {response.status}")
    except urllib.error.URLError as e:
        print(f"[Sidecar] Connection error: {e}")
    except Exception as e:
        print(f"[Sidecar] Unexpected error: {e}")
    return False

def follow(file_path):
    """Generator that yields new lines from a file, non-blocking at EOF"""
    while not os.path.exists(file_path):
        print(f"[Sidecar] Waiting for log file: {file_path}...")
        time.sleep(1)
        yield None

    with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
        # 移动到文件末尾，只读取新日志
        f.seek(0, 2)
        
        while True:
            line = f.readline()
            if not line:
                yield None # EOF, return control to main loop
            else:
                yield line

def main():
    parser = argparse.ArgumentParser(description="OpenClaw Sidecar for Log Monitoring")
    parser.add_argument("--log-file", default=DEFAULT_LOG_FILE, help="Path to log file")
    parser.add_argument("--api-url", default=DEFAULT_API_URL, help="State Hub API URL")
    parser.add_argument("--agent-id", default=DEFAULT_AGENT_ID, help="Unique Agent ID")
    
    args = parser.parse_args()
    
    print(f"[Sidecar] Starting monitoring for Agent: {args.agent_id}")
    print(f"[Sidecar] Watching log file: {args.log_file}")
    print(f"[Sidecar] Reporting to: {args.api_url}")
    
    current_status = "idle"
    current_task = "Sidecar started"
    last_heartbeat = 0
    heartbeat_interval = 5  # 5秒心跳
    
    log_stream = follow(args.log_file)
    
    try:
        while True:
            line = next(log_stream)
            
            if line:
                # 解析新日志
                new_status, content = parse_line(line)
                if new_status:
                    current_status = new_status
                    current_task = content
                    print(f"[Log] {current_status}: {content[:50]}...")
                    # 状态变更立即上报
                    send_report(args.api_url, args.agent_id, current_status, current_task)
                    last_heartbeat = time.time()
            else:
                # 没有新日志，检查心跳
                if time.time() - last_heartbeat > heartbeat_interval:
                    print(f"[Heartbeat] {current_status}")
                    send_report(args.api_url, args.agent_id, current_status, current_task)
                    last_heartbeat = time.time()
                
                time.sleep(0.1) # 避免 CPU 占用过高
                
    except KeyboardInterrupt:
        print("\n[Sidecar] Stopping...")
        send_report(args.api_url, args.agent_id, "offline", "Sidecar stopped")

if __name__ == "__main__":
    main()
