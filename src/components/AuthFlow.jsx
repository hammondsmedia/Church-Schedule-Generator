// src/components/AuthFlow.jsx
import React, { useState } from 'react';
import logoIcon from '../assets/logo-icon.svg';

const DEFAULT_SERVICE_SETTINGS = {
  sundayMorning: { enabled: true, label: 'Sunday Morning', time: '10:00 AM' },
  sundayEvening: { enabled: true, label: 'Sunday Evening', time: '6:00 PM' },
  wednesdayEvening: { enabled: true, label: 'Wednesday Evening', time: '7:30 PM' },
  communion: { enabled: true, label: 'Communion', time: '' },
};

// ── Shared layout wrapper ──────────────────────────────────────────────────
function AuthCard({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: '#1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: 'white', padding: '40px', borderRadius: '20px', width: '100%', maxWidth: '460px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <img src={logoIcon} style={{ height: '52px', marginBottom: '12px' }} alt="Logo" />
          <h2 style={{ color: '#1e3a5f', margin: 0, fontSize: '22px', fontWeight: 800 }}>Church Collab App</h2>
        </div>
        {children}
      </div>
    </div>
  );
}

function ErrorBox({ msg }) {
  if (!msg) return null;
  return <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '12px' }}>{msg}</div>;
}

function StepHeading({ title, sub }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ fontWeight: 700, fontSize: '17px', color: '#1e3a5f' }}>{title}</div>
      {sub && <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>{sub}</div>}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function AuthFlow({ auth, db, existingUser, onSetupComplete }) {
  const [step, setStep] = useState(existingUser ? 'find-church' : 'login');

  // Credentials
  const [email, setEmail]               = useState(existingUser?.email || '');
  const [password, setPassword]         = useState('');
  const [confirmPw, setConfirmPw]       = useState('');

  // Church search
  const [churchSearch, setChurchSearch] = useState('');
  const [churchResults, setChurchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedOrg, setSelectedOrg]   = useState(null);

  // Claim profile
  const [memberSearch, setMemberSearch] = useState('');
  const [verifyingMember, setVerifyingMember] = useState(null);
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyError, setVerifyError] = useState('');

  // Create church
  const [newChurchName, setNewChurchName] = useState('');

  // Shared
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [signedUpUser, setSignedUpUser] = useState(existingUser || null);

  const signupEmail = email || signedUpUser?.email || '';

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await auth.signInWithEmailAndPassword(email, password);
      // App's onAuthStateChanged will load user data and clear this screen
    } catch (err) {
      setError(err.message);
    }
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
    } catch (err) {
      setError(err.message);
    }
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
    } catch (err) {
      setChurchResults([]);
    }
    setSearchLoading(false);
  };

  const handleSelectChurch = (org) => {
    setSelectedOrg(org);
    setMemberSearch('');
    setError('');
    setStep('claim-profile');
  };

  // Final step — write user doc and optionally update claimed member
  const finishSetup = async ({ orgId, role, updatedMembers }) => {
    setLoading(true);
    setError('');
    try {
      if (updatedMembers) {
        await db.collection('organizations').doc(orgId).update({ members: updatedMembers });
      }
      await db.collection('users').doc(signedUpUser.uid).set({
        orgId,
        role,
        email: signupEmail,
        createdAt: new Date().toISOString(),
      });
      onSetupComplete();
    } catch (err) {
      setError(err.message);
    }
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
    const phoneMatch = verifyingMember.phone && phoneNorm(verifyingMember.phone) === phoneNorm(verifyInput.trim()) && phoneNorm(verifyInput.trim()).length >= 7;
    if (emailMatch || phoneMatch) {
      handleClaimProfile(verifyingMember);
    } else {
      setVerifyError('That email or phone number does not match this profile. Please try again.');
    }
  };

  const handleSkipClaim = () => {
    finishSetup({ orgId: selectedOrg.id, role: 'standard', updatedMembers: null });
  };

  const handleCreateChurch = async (e) => {
    e.preventDefault();
    if (!newChurchName.trim()) return setError('Please enter your congregation name.');
    setLoading(true);
    setError('');
    try {
      const orgRef = db.collection('organizations').doc();
      await orgRef.set({
        churchName: newChurchName.trim(),
        members: [],
        families: [],
        schedule: {},
        serviceSettings: DEFAULT_SERVICE_SETTINGS,
        createdAt: new Date().toISOString(),
      });
      await db.collection('users').doc(signedUpUser.uid).set({
        orgId: orgRef.id,
        role: 'owner',
        email: signupEmail,
        createdAt: new Date().toISOString(),
      });
      onSetupComplete();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  // ── Derived data for claim-profile step ───────────────────────────────────

  const allMembers = selectedOrg?.members || [];
  const emailMatches = allMembers.filter(m => m.email && m.email.toLowerCase() === signupEmail.toLowerCase());
  const filteredMembers = memberSearch.trim()
    ? allMembers.filter(m => {
        const full = `${m.firstName || ''} ${m.lastName || ''}`.toLowerCase();
        return full.includes(memberSearch.toLowerCase());
      })
    : allMembers;

  // ── Render steps ──────────────────────────────────────────────────────────

  const inputStyle = { width: '100%', padding: '12px 14px', border: '2px solid #e5e0d8', borderRadius: '10px', fontSize: '15px', outline: 'none', boxSizing: 'border-box', fontFamily: 'Outfit, sans-serif' };
  const btnPrimary = { background: '#1e3a5f', color: 'white', border: 'none', padding: '13px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '15px', width: '100%', fontFamily: 'Outfit, sans-serif' };
  const btnSecondary = { background: 'white', color: '#1e3a5f', border: '2px solid #e5e7eb', padding: '11px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px', width: '100%', fontFamily: 'Outfit, sans-serif', marginTop: '8px' };
  const linkBtn = { background: 'none', border: 'none', color: '#1e3a5f', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline', fontSize: '14px', fontFamily: 'Outfit, sans-serif', padding: 0 };

  // ── LOGIN ─────────────────────────────────────────────────────────────────
  if (step === 'login') return (
    <AuthCard>
      <StepHeading title="Welcome back" sub="Sign in to your congregation account." />
      <ErrorBox msg={error} />
      <form onSubmit={handleLogin} style={{ display: 'grid', gap: '12px' }}>
        <input style={inputStyle} placeholder="Email address" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input style={inputStyle} placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        <button style={btnPrimary} type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</button>
      </form>
      <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#6b7280' }}>
        New here?{' '}
        <button style={linkBtn} onClick={() => { setError(''); setStep('signup-creds'); }}>Create an account</button>
      </div>
    </AuthCard>
  );

  // ── SIGN-UP CREDENTIALS ───────────────────────────────────────────────────
  if (step === 'signup-creds') return (
    <AuthCard>
      <StepHeading title="Create your account" sub="Step 1 of 3 — We'll find your congregation next." />
      <ErrorBox msg={error} />
      <form onSubmit={handleSignUpCreds} style={{ display: 'grid', gap: '12px' }}>
        <input style={inputStyle} placeholder="Email address" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input style={inputStyle} placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        <input style={inputStyle} placeholder="Confirm password" type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required />
        <button style={btnPrimary} type="submit" disabled={loading}>{loading ? 'Creating account…' : 'Continue →'}</button>
      </form>
      <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#6b7280' }}>
        Already have an account?{' '}
        <button style={linkBtn} onClick={() => { setError(''); setStep('login'); }}>Sign in</button>
      </div>
    </AuthCard>
  );

  // ── FIND CHURCH ───────────────────────────────────────────────────────────
  if (step === 'find-church') return (
    <AuthCard>
      <StepHeading title="Find your congregation" sub="Step 2 of 3 — Search by name to locate your church in the system." />
      <ErrorBox msg={error} />
      <input
        style={inputStyle}
        placeholder="Search congregation name…"
        value={churchSearch}
        onChange={e => handleSearchChurches(e.target.value)}
        autoFocus
      />
      <div style={{ marginTop: '10px', maxHeight: '260px', overflowY: 'auto' }}>
        {searchLoading && <div style={{ color: '#6b7280', fontSize: '13px', padding: '10px 0' }}>Searching…</div>}
        {!searchLoading && churchSearch.length >= 2 && churchResults.length === 0 && (
          <div style={{ color: '#6b7280', fontSize: '13px', padding: '10px 0' }}>No congregations found matching "{churchSearch}".</div>
        )}
        {churchResults.map(org => (
          <button
            key={org.id}
            onClick={() => handleSelectChurch(org)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '12px 14px', marginBottom: '6px', background: '#f8f6f3', border: '2px solid #e5e0d8', borderRadius: '10px', cursor: 'pointer', textAlign: 'left', fontFamily: 'Outfit, sans-serif' }}
          >
            <div>
              <div style={{ fontWeight: 700, color: '#1e3a5f', fontSize: '15px' }}>{org.churchName}</div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{(org.members || []).length} members in directory</div>
            </div>
            <span style={{ color: '#1e3a5f', fontWeight: 700 }}>Select →</span>
          </button>
        ))}
      </div>
      <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '16px', paddingTop: '16px' }}>
        <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px', textAlign: 'center' }}>Don't see your congregation?</div>
        <button style={btnSecondary} onClick={() => { setError(''); setStep('create-church'); }}>+ Create a New Congregation</button>
      </div>
    </AuthCard>
  );

  // ── CLAIM PROFILE ─────────────────────────────────────────────────────────
  if (step === 'claim-profile') return (
    <AuthCard>
      <StepHeading
        title={`Are you in ${selectedOrg.churchName}'s directory?`}
        sub="Step 3 of 3 — Claim an existing profile to link your account, or skip if you're new."
      />
      <ErrorBox msg={error} />

      {/* Email-matched suggestions */}
      {emailMatches.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Suggested match</div>
          {emailMatches.map(m => (
            <MemberClaimCard key={m.id} member={m} onClaim={() => handleClaimProfile(m)} loading={loading} highlight />
          ))}
        </div>
      )}

      {/* Verification overlay */}
      {verifyingMember && (
        <div style={{ background: '#f0f9ff', border: '2px solid #bae6fd', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
          <div style={{ fontWeight: 700, color: '#1e3a5f', fontSize: '14px', marginBottom: '4px' }}>
            Verify your identity for {verifyingMember.firstName} {verifyingMember.lastName}
          </div>
          <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '10px' }}>
            Enter the email address or phone number on this profile to confirm it's yours.
          </div>
          <input
            style={{ ...inputStyle, marginBottom: '8px' }}
            placeholder="Email or phone number on profile…"
            value={verifyInput}
            onChange={e => { setVerifyInput(e.target.value); setVerifyError(''); }}
            autoFocus
          />
          {verifyError && <div style={{ color: '#b91c1c', fontSize: '13px', marginBottom: '8px' }}>{verifyError}</div>}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleVerifyAndClaim} disabled={loading || !verifyInput.trim()} style={{ ...btnPrimary, width: 'auto', padding: '9px 18px', fontSize: '14px' }}>
              Confirm & Claim
            </button>
            <button onClick={() => setVerifyingMember(null)} style={{ ...btnSecondary, width: 'auto', padding: '9px 18px', fontSize: '14px', marginTop: 0 }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search all members */}
      <input
        style={{ ...inputStyle, marginBottom: '10px' }}
        placeholder="Search by first or last name…"
        value={memberSearch}
        onChange={e => setMemberSearch(e.target.value)}
      />
      <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'grid', gap: '6px' }}>
        {filteredMembers
          .filter(m => !emailMatches.find(em => em.id === m.id)) // don't double-show email matches
          .map(m => (
            <MemberClaimCard key={m.id} member={m} onClaim={() => handleRequestVerify(m)} loading={loading} />
          ))}
        {filteredMembers.length === 0 && (
          <div style={{ color: '#6b7280', fontSize: '13px', padding: '8px 0' }}>No members match your search.</div>
        )}
      </div>

      <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '16px', paddingTop: '16px' }}>
        <button style={btnSecondary} onClick={handleSkipClaim} disabled={loading}>
          I'm not in the directory yet — Skip
        </button>
        <button style={{ ...linkBtn, display: 'block', margin: '12px auto 0', color: '#6b7280' }} onClick={() => setStep('find-church')}>
          ← Back to church search
        </button>
      </div>
    </AuthCard>
  );

  // ── CREATE CHURCH ─────────────────────────────────────────────────────────
  if (step === 'create-church') return (
    <AuthCard>
      <StepHeading title="Create your congregation" sub="You'll be set as the owner and can invite others afterward." />
      <ErrorBox msg={error} />
      <form onSubmit={handleCreateChurch} style={{ display: 'grid', gap: '12px' }}>
        <input
          style={inputStyle}
          placeholder="Congregation name (e.g. Oak Hill Church of Christ)"
          value={newChurchName}
          onChange={e => setNewChurchName(e.target.value)}
          required
          autoFocus
        />
        <button style={btnPrimary} type="submit" disabled={loading}>{loading ? 'Creating…' : '🏛️ Create Congregation'}</button>
      </form>
      <button style={{ ...linkBtn, display: 'block', margin: '16px auto 0', color: '#6b7280' }} onClick={() => { setError(''); setStep('find-church'); }}>
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
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '10px 12px', borderRadius: '10px', border: `2px solid ${highlight ? '#a7f3d0' : '#e5e0d8'}`,
      background: highlight ? '#f0fdf4' : '#fafaf9',
    }}>
      {member.photoURL
        ? <img src={member.photoURL} alt="" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
        : <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#1e3a5f', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px', flexShrink: 0 }}>{initials}</div>
      }
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: '#1e3a5f', fontSize: '14px' }}>{member.firstName} {member.lastName}</div>
        {member.email && <div style={{ fontSize: '12px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.email}</div>}
      </div>
      <button
        onClick={onClaim}
        disabled={loading}
        style={{ background: '#1e3a5f', color: 'white', border: 'none', padding: '7px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '13px', flexShrink: 0, fontFamily: 'Outfit, sans-serif' }}
      >
        Claim
      </button>
    </div>
  );
}
