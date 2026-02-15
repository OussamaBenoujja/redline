import os
import subprocess
from datetime import datetime, timedelta

def run_cmd(cmd, env=None):
    subprocess.run(cmd, shell=True, check=True, env=env)

def main():
    # Get all untracked files
    result = subprocess.run('git ls-files --others --exclude-standard', shell=True, capture_output=True, text=True)
    files = [f for f in result.stdout.strip().split('\n') if f]
    
    start_date = datetime(2026, 1, 1, 12, 0, 0)
    commit_types = ["feat", "fix", "docs", "refactor", "tests"]
    
    # We have 46 days (Jan 1 to Feb 15) and 48 files.
    # So we'll iterate through 46 days and just add one file per day, and dump the rest on the last day.
    # Wait, the prompt says "at least 40 commits each in a differnet day". 
    # Let's just do exactly 46 days.
    
    env = os.environ.copy()
    
    for i, file in enumerate(files):
        # Determine the date offset. Cap at 45 (which is 2026-02-15).
        day_offset = min(i, 45)
        commit_date = start_date + timedelta(days=day_offset)
        date_str = commit_date.strftime("%Y-%m-%dT%H:%M:%S")
        
        # Determine prefix
        prefix = commit_types[i % len(commit_types)]
        
        # Git add
        run_cmd(f'git add "{file}"')
        
        # We need to set commiter and author dates
        env['GIT_COMMITTER_DATE'] = date_str
        env['GIT_AUTHOR_DATE'] = date_str
        
        msg = f"{prefix}: initial commit for {os.path.basename(file)}"
        
        run_cmd(f'git commit -m "{msg}"', env=env)

if __name__ == "__main__":
    main()
