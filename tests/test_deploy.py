"""Exercise deployment success and recovery without touching a real Docker host."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts' / 'deploy.sh'
FAKE = '''#!/usr/bin/env python3
import json, os, pathlib, sys
root = pathlib.Path(os.environ['DEPLOY_TEST_ROOT'])
name = pathlib.Path(sys.argv[0]).name
args = sys.argv[1:]
with (root/'calls').open('a') as f: f.write(json.dumps([name,*args])+'\\n')
if name == 'docker':
    if args[0] == 'pull' and os.environ.get('FAIL_PULL'): sys.exit(1)
    if args[0] == 'inspect':
        if not os.environ.get('PREVIOUS'): sys.exit(1)
        if '--format' in args: print('image:previous')
    if args[0] == 'run': (root/'running').write_text(args[-1])
if name == 'curl':
    if os.environ.get('FAIL_HEALTH'): sys.exit(1)
    print('<html><div id="root"></div></html>')
'''


class DeployTests(unittest.TestCase):
    def run_deploy(self, **flags):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for name in ('docker', 'curl', 'sleep', 'flock'):
                path = root / name
                path.write_text(FAKE)
                path.chmod(0o755)
            env = dict(os.environ, HOME=directory, DEPLOY_TEST_ROOT=directory,
                       PATH=directory+os.pathsep+os.environ['PATH'], **flags)
            result = subprocess.run(['bash', str(SCRIPT), 'image:new'], env=env,
                                    capture_output=True, text=True, timeout=20)
            calls = [json.loads(line) for line in (root/'calls').read_text().splitlines()] if (root/'calls').exists() else []
            running = (root/'running').read_text() if (root/'running').exists() else None
            return result, calls, running

    def test_first_deployment_is_healthy_and_binds_only_loopback(self):
        result, calls, running = self.run_deploy()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(running, 'image:new')
        run = next(c for c in calls if c[:2] == ['docker', 'run'])
        self.assertIn('127.0.0.1:5173:80', run)
        self.assertTrue(any('/health' in ' '.join(c) for c in calls if c[0]=='curl'))

    def test_unhealthy_deployment_restores_previous_image(self):
        result, calls, running = self.run_deploy(PREVIOUS='1', FAIL_HEALTH='1')
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(running, 'image:previous')
        self.assertIn(['docker', 'rm', '-f', 'matricula-frontend'], calls)

    def test_pull_failure_keeps_existing_container(self):
        result, calls, _ = self.run_deploy(PREVIOUS='1', FAIL_PULL='1')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn(['docker', 'pull', 'image:new'], calls)
        self.assertFalse(any(c[:2] in (['docker', 'stop'], ['docker', 'rm']) for c in calls))


if __name__ == '__main__':
    unittest.main()
