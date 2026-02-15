// ... (imports remain the same)

export default function ChurchScheduleApp() {
  // ... (state remains the same)

  // --- UPDATED SAVE LOGIC ---
  const handleUpdateSelf = async (updatedData) => {
    try {
      setDataLoading(true);
      
      // 1. Update the individual user document (for login data)
      await db.current.collection('users').doc(user.uid).update(updatedData);
      
      // 2. Update the Directory entry inside the Organization document
      const updatedMembers = members.map(m => 
        m.id === user.uid ? { ...m, ...updatedData } : m
      );
      
      // Manually trigger organization save so standard users can update themselves
      await db.current.collection('organizations').doc(orgId).update({
        members: updatedMembers,
        updatedAt: new Date().toISOString()
      });

      // 3. Update local state to reflect changes on screen
      setMembers(updatedMembers);
      
      alert("Profile updated successfully!");
    } catch (err) {
      console.error("Save failed:", err);
      alert("Error saving profile. Please try again.");
    } finally {
      setDataLoading(false);
    }
  };

  // ... (handleDeleteAccount and handleLogin remain the same)

  // ... (Rest of App.jsx remains the same)
}
