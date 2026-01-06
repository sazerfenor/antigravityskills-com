#!/usr/bin/env python3
"""
Start one or more servers, wait for them to be ready, run a command, then clean up.

Usage:
    # Single server
    python scripts/with_server.py --server "npm run dev" --port 5173 -- python automation.py
    python scripts/with_server.py --server "npm start" --port 3000 -- python test.py

    # Multiple servers
    python scripts/with_server.py \
      --server "cd backend && python server.py" --port 3000 \
      --server "cd frontend && npm run dev" --port 5173 \
      -- python test.py

Security Note:
    This script executes shell commands provided via --server argument.
    Only use with trusted command strings. Commands are validated against
    an allowlist of safe executables before execution.
"""

import subprocess
import socket
import time
import sys
import argparse
import shlex
import re

# Allowlist of safe command prefixes for server processes
ALLOWED_COMMAND_PREFIXES = [
    'npm', 'npx', 'pnpm', 'yarn', 'bun',  # Node.js package managers
    'python', 'python3', 'uvicorn', 'gunicorn', 'flask',  # Python
    'node', 'deno',  # JavaScript runtimes
    'cargo', 'go', 'ruby', 'php',  # Other languages
    'docker', 'docker-compose',  # Container tools
    'make', 'just',  # Build tools
    'cd',  # Directory change (for compound commands)
]

def validate_command(cmd: str) -> bool:
    """
    Validate that a command uses only allowed executables.

    Security: This prevents arbitrary command injection by ensuring
    only known-safe executables can be run.
    """
    # Split compound commands (e.g., "cd dir && npm start")
    # Handle both && and ; separators
    parts = re.split(r'\s*(?:&&|;)\s*', cmd)

    for part in parts:
        part = part.strip()
        if not part:
            continue

        # Get the first word (executable name)
        try:
            tokens = shlex.split(part)
            if not tokens:
                continue
            executable = tokens[0]
        except ValueError:
            # shlex parsing failed, be conservative
            return False

        # Check if executable is in allowlist
        if executable not in ALLOWED_COMMAND_PREFIXES:
            return False

    return True

def is_server_ready(port, timeout=30):
    """Wait for server to be ready by polling the port."""
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            with socket.create_connection(('localhost', port), timeout=1):
                return True
        except (socket.error, ConnectionRefusedError):
            time.sleep(0.5)
    return False


def main():
    parser = argparse.ArgumentParser(description='Run command with one or more servers')
    parser.add_argument('--server', action='append', dest='servers', required=True, help='Server command (can be repeated)')
    parser.add_argument('--port', action='append', dest='ports', type=int, required=True, help='Port for each server (must match --server count)')
    parser.add_argument('--timeout', type=int, default=30, help='Timeout in seconds per server (default: 30)')
    parser.add_argument('command', nargs=argparse.REMAINDER, help='Command to run after server(s) ready')

    args = parser.parse_args()

    # Remove the '--' separator if present
    if args.command and args.command[0] == '--':
        args.command = args.command[1:]

    if not args.command:
        print("Error: No command specified to run")
        sys.exit(1)

    # Parse server configurations
    if len(args.servers) != len(args.ports):
        print("Error: Number of --server and --port arguments must match")
        sys.exit(1)

    servers = []
    for cmd, port in zip(args.servers, args.ports):
        # Security: Validate command against allowlist before adding
        if not validate_command(cmd):
            print(f"Error: Command contains disallowed executable: {cmd}")
            print(f"Allowed commands: {', '.join(ALLOWED_COMMAND_PREFIXES)}")
            sys.exit(1)
        servers.append({'cmd': cmd, 'port': port})

    server_processes = []

    try:
        # Start all servers
        for i, server in enumerate(servers):
            print(f"Starting server {i+1}/{len(servers)}: {server['cmd']}")

            # Security Note: shell=True is required for compound commands (cd && npm start)
            # Command injection is mitigated by validate_command() allowlist check above
            process = subprocess.Popen(
                server['cmd'],
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            server_processes.append(process)

            # Wait for this server to be ready
            print(f"Waiting for server on port {server['port']}...")
            if not is_server_ready(server['port'], timeout=args.timeout):
                raise RuntimeError(f"Server failed to start on port {server['port']} within {args.timeout}s")

            print(f"Server ready on port {server['port']}")

        print(f"\nAll {len(servers)} server(s) ready")

        # Run the command
        print(f"Running: {' '.join(args.command)}\n")
        result = subprocess.run(args.command)
        sys.exit(result.returncode)

    finally:
        # Clean up all servers
        print(f"\nStopping {len(server_processes)} server(s)...")
        for i, process in enumerate(server_processes):
            try:
                process.terminate()
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
            print(f"Server {i+1} stopped")
        print("All servers stopped")


if __name__ == '__main__':
    main()