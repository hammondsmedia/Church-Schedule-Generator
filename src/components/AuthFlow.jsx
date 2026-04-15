// src/components/AuthFlow.jsx
import React, { useState } from 'react';

const DEFAULT_SERVICE_SETTINGS = {
  sundayMorning: { enabled: true, label: 'Sunday Morning', time: '10:00 AM' },
  sundayEvening: { enabled: true, label: 'Sunday Evening', time: '6:00 PM' },
  wednesdayEvening: { enabled: true, label: 'Wednesday Evening', time: '7:30 PM' },
  communion: { enabled: true, label: 'Communion', time: '' },
};

// ── Step progress indicator ────────────────────────────────────────────────
function StepDots({ total, current }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 24 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i === current ? 20 : 6, height: 6,
          borderRadius: 99,
          background: i === current ? 'var(--primary)' : 'var(--border)',
          transition: 'all 300ms ease',
        }} />
      ))}
    </div>
  );
}

// ── Shared layout wrapper ──────────────────────────────────────────────────
function AuthCard({ children, step }) {
  const stepIndex = { 'login': -1, 'signup-creds': 0, 'find-church': 1, 'claim-profile': 2, 'create-church': 1 }[step] ?? -1;
  const isSignupFlow = ['signup-creds', 'find-church', 'claim-profile', 'create-church'].includes(step);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h2 style={{ color: 'var(--text)', margin: '0 0 4px 0', fontSize: 26, fontWeight: 800, letterSpacing: '-0.05em' }}>
            Collab<span style={{ color: 'var(--primary)' }}>App</span>
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-3)' }}>Congregation scheduling &amp; directory</p>
        </div>
        {isSignupFlow && stepIndex >= 0 && <StepDots total={3} current={stepIndex} />}
        {children}
      </div>
    </div>
  );
}

function ErrorBox({ msg }) {
  if (!msg) return null;
  return (
    <div className="info-box error" style={{ marginBottom: 16, fontSize: 13 }}>
      {msg}
    </div>
  );
}

function StepHeading({ title, sub }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--text)', letterSpacing: '-0.03em' }}>{title}</div>
      {sub && <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.5 }}>{sub}</div>}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function AuthFlow({ auth, db, existingUser, onSetupComplete }) {
  const [step, setStep] = useState(existingUser ? 'find-church' : 'login');

  const [email, setEmail]             = useState(existingUser?.email || '');
  const [password, setPassword]       = useState('');
  const [confirmPw, setConfirmPw]     = useState('');

  const [churchSearch, setChurchSearch]   = useState('');
  const [churchResults, setChurchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedOrg, setSelectedOrg]     = useState(null);

  const [memberSearch, setMemberSearch]       = useState('');
  const [verifyingMember, setVerifyingMember] = useState(null);
  const [verifyInput, setVerifyInput]         = useState('');
  const [verifyError, setVerifyError]         = useState('');

  const [newChurchName, setNewChurchName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [signedUpUser, setSignedUpUser] = useState(existingUser || null);

  const signupEmail = email || signedUpUser?.email || '';

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await auth.signInWithEmailAndPassword(email, password);
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  const handleSignUpCreds = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (password !== confirmPw) return setError("Passwords don't match.");
    setLoading(true);
    try {
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      setSignedUpUser(cred.user);
      setStep('find-church');
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  const handleSearchChurches = async (query) => {
    setChurchSearch(query);
    setChurchResults([]);
    if (!query.trim() || query.trim().length < 2) return;
    setSearchLoading(true);
    try {
      const snap = await db.collection('organizations').get();
      const q = query.toLowerCase();
      const results = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(o => (o.churchName || '').toLowerCase().includes(q))
        .slice(0, 12);
      setChurchResults(results);
    } catch (err) { setChurchResults([]); }
    setSearchLoading(false);
  };

  const handleSelectChurch = (org) => {
    setSelectedOrg(org);
    setMemberSearch('');
    setError('');
    setStep('claim-profile');
  };

  const finishSetup = async ({ orgId, role, updatedMembers }) => {
    setLoading(true);
    setError('');
    try {
      if (updatedMembers) {
        await db.collection('organizations').doc(orgId).update({ members: updatedMembers });
      }
      await db.collection('users').doc(signedUpUser.uid).set({
        orgId, role,
        email: signupEmail,
        createdAt: new Date().toISOString(),
      });
      onSetupComplete();
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  const handleClaimProfile = (member) => {
    const updatedMembers = (selectedOrg.members || []).map(m =>
      m.id === member.id
        ? { ...m, id: signedUpUser.uid, hasAccount: true, email: signupEmail }
        : m
    );
    finishSetup({ orgId: selectedOrg.id, role: 'standard', updatedMembers });
  };

  const handleRequestVerify = (member) => {
    setVerifyingMember(member);
    setVerifyInput('');
    setVerifyError('');
  };

  const handleVerifyAndClaim = () => {
    const val = verifyInput.trim().toLowerCase();
    const emailMatch = verifyingMember.email && verifyingMember.email.toLowerCase() === val;
    const phoneNorm = (str) => str.replace(/\D/g, '');
    const phoneMatch = verifyingMember.phone
      && phoneNorm(verifyingMember.phone) === phoneNorm(verifyInput.trim())
      && phoneNorm(verifyInput.trim()).length >= 7;
    if (emailMatch || phoneMatch) {
      handleClaimProfile(verifyingMember);
    } else {
      setVerifyError('That email or phone number does not match this profile.');
    }
  };

  const handleSkipClaim = () => finishSetup({ orgId: selectedOrg.id, role: 'standard', updatedMembers: null });

  const handleCreateChurch = async (e) => {
    e.preventDefault();
    if (!newChurchName.trim()) return setError('Please enter your congregation name.');
    setLoading(true);
    setError('');
    try {
      const orgRef = db.collection('organizations').doc();
      await orgRef.set({
        churchName: newChurchName.trim(),
        members: [], families: [], schedule: {},
        serviceSettings: DEFAULT_SERVICE_SETTINGS,
        createdAt: new Date().toISOString(),
      });
      await db.collection('users').doc(signedUpUser.uid).set({
        orgId: orgRef.id, role: 'owner',
        email: signupEmail,
        createdAt: new Date().toISOString(),
      });
      onSetupComplete();
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const allMembers = selectedOrg?.members || [];
  const emailMatches = allMembers.filter(m => m.email && m.email.toLowerCase() === signupEmail.toLowerCase());
  const filteredMembers = memberSearch.trim()
    ? allMembers.filter(m => `${m.firstName || ''} ${m.lastName || ''}`.toLowerCase().includes(memberSearch.toLowerCase()))
    : allMembers;

  // ── LOGIN ─────────────────────────────────────────────────────────────────
  if (step === 'login') return (
    <AuthCard step={step}>
      <StepHeading title="Welcome back" sub="Sign in to your congregation account." />
      <ErrorBox msg={error} />
      <form onSubmit={handleLogin} style={{ display: 'grid', gap: 10 }}>
        <input className="auth-input" placeholder="Email address" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input className="auth-input" placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        <button className="auth-btn-primary" type="submit" disabled={loading} style={{ marginTop: 4 }}>
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
      <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-3)' }}>
        New here?{' '}
        <button className="auth-link" onClick={() => { setError(''); setStep('signup-creds'); }}>Create an account</button>
      </div>
    </AuthCard>
  );

  // ── SIGN-UP CREDENTIALS ───────────────────────────────────────────────────
  if (step === 'signup-creds') return (
    <AuthCard step={step}>
      <StepHeading title="Create your account" sub="Step 1 of 3 — We'll find your congregation next." />
      <ErrorBox msg={error} />
      <form onSubmit={handleSignUpCreds} style={{ display: 'grid', gap: 10 }}>
        <input className="auth-input" placeholder="Email address" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input className="auth-input" placeholder="Password (min 6 chars)" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        <input className="auth-input" placeholder="Confirm password" type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required />
        <button className="auth-btn-primary" type="submit" disabled={loading} style={{ marginTop: 4 }}>
          {loading ? 'Creating account…' : 'Continue →'}
        </button>
      </form>
      <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-3)' }}>
        Already have an account?{' '}
        <button className="auth-link" onClick={() => { setError(''); setStep('login'); }}>Sign in</button>
      </div>
    </AuthCard>
  );

  // ── FIND CHURCH ───────────────────────────────────────────────────────────
  if (step === 'find-church') return (
    <AuthCard step={step}>
      <StepHeading title="Find your congregation" sub="Step 2 of 3 — Search by name to locate your church." />
      <ErrorBox msg={error} />
      <div style={{ position: 'relative', marginBottom: 8 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }}>
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          className="auth-input"
          style={{ paddingLeft: 36 }}
          placeholder="Search congregation name…"
          value={churchSearch}
          onChange={e => handleSearchChurches(e.target.value)}
          autoFocus
        />
      </div>

      <div style={{ maxHeight: 260, overflowY: 'auto' }}>
        {searchLoading && (
          <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '10px 0', textAlign: 'center' }}>Searching…</div>
        )}
        {!searchLoading && churchSearch.length >= 2 && churchResults.length === 0 && (
          <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '10px 0', textAlign: 'center' }}>
            No congregations found matching "{churchSearch}"
          </div>
        )}
        <div style={{ display: 'grid', gap: 6 }}>
          {churchResults.map(org => (
            <button
              key={org.id}
              onClick={() => handleSelectChurch(org)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '12px 14px',
                background: 'var(--surface-2)', border: '1.5px solid var(--border)',
                borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left',
                transition: 'all 150ms ease',
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--primary-light)'; e.currentTarget.style.background = 'var(--primary-xlight)'; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface-2)'; }}
            >
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14, letterSpacing: '-0.02em' }}>{org.churchName}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{(org.members || []).length} members</div>
              </div>
              <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 13 }}>Select →</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', marginTop: 16, paddingTop: 16 }}>
        <p style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', margin: '0 0 10px' }}>Don't see your congregation?</p>
        <button className="auth-btn-secondary" onClick={() => { setError(''); setStep('create-church'); }}>
          + Create a New Congregation
        </button>
      </div>
    </AuthCard>
  );

  // ── CLAIM PROFILE ─────────────────────────────────────────────────────────
  if (step === 'claim-profile') return (
    <AuthCard step={step}>
      <StepHeading
        title={`Are you in ${selectedOrg.churchName}?`}
        sub="Step 3 of 3 — Claim your existing profile, or skip if you're new."
      />
      <ErrorBox msg={error} />

      {/* Email-matched suggestions */}
      {emailMatches.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Suggested match
          </div>
          {emailMatches.map(m => (
            <MemberClaimCard key={m.id} member={m} onClaim={() => handleClaimProfile(m)} loading={loading} highlight />
          ))}
        </div>
      )}

      {/* Verification overlay */}
      {verifyingMember && (
        <div className="info-box info" style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: 'var(--text)' }}>
            Verify for {verifyingMember.firstName} {verifyingMember.lastName}
          </div>
          <p style={{ fontSize: 13, margin: '0 0 10px' }}>Enter the email or phone number on this profile.</p>
          <input
            className="auth-input"
            style={{ marginBottom: 8 }}
            placeholder="Email or phone number…"
            value={verifyInput}
            onChange={e => { setVerifyInput(e.target.value); setVerifyError(''); }}
            autoFocus
          />
          {verifyError && <div style={{ color: 'var(--error)', fontSize: 13, marginBottom: 8 }}>{verifyError}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleVerifyAndClaim}
              disabled={loading || !verifyInput.trim()}
              className="auth-btn-primary"
              style={{ flex: 1, marginTop: 0, padding: '10px 16px', fontSize: 13 }}
            >
              Confirm & Claim
            </button>
            <button
              onClick={() => setVerifyingMember(null)}
              className="auth-btn-secondary"
              style={{ flex: 1, marginTop: 0, padding: '10px 16px', fontSize: 13 }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search all members */}
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }}>
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          className="auth-input"
          style={{ paddingLeft: 36 }}
          placeholder="Search by name…"
          value={memberSearch}
          onChange={e => setMemberSearch(e.target.value)}
        />
      </div>

      <div style={{ maxHeight: 220, overflowY: 'auto', display: 'grid', gap: 6 }}>
        {filteredMembers
          .filter(m => !emailMatches.find(em => em.id === m.id))
          .map(m => (
            <MemberClaimCard key={m.id} member={m} onClaim={() => handleRequestVerify(m)} loading={loading} />
          ))}
        {filteredMembers.length === 0 && (
          <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '8px 0' }}>No members match your search.</div>
        )}
      </div>

      <div style={{ borderTop: '1px solid var(--border)', marginTop: 14, paddingTop: 14 }}>
        <button className="auth-btn-secondary" onClick={handleSkipClaim} disabled={loading}>
          I'm not in the directory yet — Skip
        </button>
        <button
          className="auth-link"
          style={{ display: 'block', margin: '12px auto 0', color: 'var(--text-3)', fontSize: 13 }}
          onClick={() => setStep('find-church')}
        >
          ← Back to church search
        </button>
      </div>
    </AuthCard>
  );

  // ── CREATE CHURCH ─────────────────────────────────────────────────────────
  if (step === 'create-church') return (
    <AuthCard step={step}>
      <StepHeading title="Create your congregation" sub="You'll be set as the owner and can invite others afterward." />
      <ErrorBox msg={error} />
      <form onSubmit={handleCreateChurch} style={{ display: 'grid', gap: 10 }}>
        <input
          className="auth-input"
          placeholder="Congregation name (e.g. Oak Hill Church of Christ)"
          value={newChurchName}
          onChange={e => setNewChurchName(e.target.value)}
          required
          autoFocus
        />
        <button className="auth-btn-primary" type="submit" disabled={loading} style={{ marginTop: 4 }}>
          {loading ? 'Creating…' : 'Create Congregation'}
        </button>
      </form>
      <button
        className="auth-link"
        style={{ display: 'block', margin: '16px auto 0', color: 'var(--text-3)', fontSize: 13 }}
        onClick={() => { setError(''); setStep('find-church'); }}
      >
        ← Back to church search
      </button>
    </AuthCard>
  );

  return null;
}

// ── Sub-component: member card in claim step ───────────────────────────────
function MemberClaimCard({ member, onClaim, loading, highlight }) {
  const initials = `${(member.firstName || '')[0] || ''}${(member.lastName || '')[0] || ''}`.toUpperCase();
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 12px', borderRadius: 'var(--radius-md)',
      border: `1.5px solid ${highlight ? 'var(--success-border)' : 'var(--border)'}`,
      background: highlight ? 'var(--success-bg)' : 'var(--surface-2)',
    }}>
      {member.photoURL ? (
        <img src={member.photoURL} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
      ) : (
        <div className="avatar-circle" style={{ width: 36, height: 36, fontSize: 13, flexShrink: 0 }}>{initials}</div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14, letterSpacing: '-0.02em' }}>
          {member.firstName} {member.lastName}
        </div>
        {member.email && (
          <div style={{ fontSize: 12, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {member.email}
          </div>
        )}
      </div>
      <button
        onClick={onClaim}
        disabled={loading}
        className="btn-primary"
        style={{ padding: '7px 14px', fontSize: 12, flexShrink: 0, boxShadow: 'none' }}
      >
        Claim
      </button>
    </div>
  );
}
