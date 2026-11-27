import { Check, Circle } from 'lucide-react';

const PASSWORD_RULES = [
  { id: 'len', label: '8+ characters', test: (v) => v.length >= 8 },
  { id: 'lower', label: 'Lowercase letter', test: (v) => /[a-z]/.test(v) },
  { id: 'upper', label: 'Uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { id: 'digit', label: 'Number (0-9)', test: (v) => /\d/.test(v) },
  { id: 'special', label: 'Special (!@#$%^&*)', test: (v) => /[!@#$%^&*]/.test(v) }
];

export function isStrongPassword(password) {
  return typeof password === 'string' && PASSWORD_RULES.every((rule) => rule.test(password));
}

export function generateSecurePassword(length = 12) {
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const special = '!@#$%^&*';
  const all = lower + upper + digits + special;

  const pick = (chars) => chars[Math.floor(Math.random() * chars.length)];
  const chars = [pick(lower), pick(upper), pick(digits), pick(special)];
  while (chars.length < length) {
    chars.push(pick(all));
  }
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

export function PasswordStrengthMeter({ password = '' }) {
  const results = PASSWORD_RULES.map((rule) => ({
    ...rule,
    passed: rule.test(password)
  }));
  const passedCount = results.filter((r) => r.passed).length;
  const pct = (passedCount / PASSWORD_RULES.length) * 100;

  let barColor = '#cbd5e1';
  if (passedCount >= 5) barColor = '#047857';
  else if (passedCount >= 3) barColor = '#d97706';
  else if (passedCount >= 1) barColor = '#dc2626';

  return (
    <div className="pw-meter" aria-label="Password strength requirements">
      <div className="pw-meter-bar-track">
        <div
          className="pw-meter-bar-fill"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
      <div className="pw-rules-grid">
        {results.map((rule) => (
          <div key={rule.id} className={`pw-rule ${rule.passed ? 'passed' : ''}`}>
            {rule.passed ? <Check size={12} /> : <Circle size={10} />}
            <span>{rule.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
