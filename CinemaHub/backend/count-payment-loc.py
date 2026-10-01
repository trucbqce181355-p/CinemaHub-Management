"""Count physical Java code lines; preserve strings, remove blank/comment-only lines."""
import json
import re
import subprocess
from pathlib import Path

base = Path(__file__).resolve().parent
repo = base.parent.parent
main = base / 'src/main/java/com/example/cinemahub'
paths = [main / p for p in (
    'model/Payment.java', 'repository/PaymentRepository.java',
    'service/PaymentService.java', 'service/PaymentTimeoutScheduler.java',
    'service/VnPayService.java', 'controller/PaymentController.java')]
paths += sorted((base / 'src/test/java').rglob('Payment*Test.java'))
pattern = re.compile(r'"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'|//[^\n]*|/\*[\s\S]*?\*/')
rows = []
for path in paths:
    source = path.read_text(encoding='utf8')
    clean = pattern.sub(lambda m: '\n' * m[0].count('\n') if m[0].startswith(('//', '/*')) else m[0], source)
    code = {i for i, line in enumerate(clean.splitlines(), 1) if line.strip()}
    relative = path.relative_to(repo).as_posix()
    prefix = ['git', '-c', f'safe.directory={repo.as_posix()}', '-C', str(repo)]
    exists = subprocess.run(prefix + ['cat-file', '-e', 'origin/dev:' + relative], capture_output=True).returncode == 0
    if exists:
        diff = subprocess.check_output(prefix + ['diff', '--no-ext-diff', '--unified=0', 'origin/dev', '--', relative], text=True, encoding='utf8')
        added = set()
        for start, count in re.findall(r'^@@ .*? \+(\d+)(?:,(\d+))? @@', diff, re.M):
            added.update(range(int(start), int(start) + (int(count) if count else 1)))
    else:
        added = code
    rows.append({'file': path.relative_to(base).as_posix(), 'code_lines': len(code), 'added_or_replaced_code_lines_vs_dev': len(code & added)})
report = {
    'method': 'Physical nonblank noncomment Java lines in selected payment/test files only. Added/replaced lines are diff vs origin/dev, not net growth; Booking/frontend/config edits excluded.',
    'difficulty_points': {'initiate': 120, 'confirm': 120, 'timeout': 240, 'total': 480},
    'files': rows,
    'total_code_lines': sum(row['code_lines'] for row in rows),
    'added_or_replaced_code_lines_vs_dev': sum(row['added_or_replaced_code_lines_vs_dev'] for row in rows)
}
(base / 'PAYMENT_LOC.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf8')
print(json.dumps(report, ensure_ascii=False, indent=2))
