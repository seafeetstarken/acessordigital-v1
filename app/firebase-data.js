async function firestoreTools() {
  return import('https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js');
}

export async function loadCollectionForWorkspace(firebase, collectionName, workspaceId) {
  if (!firebase?.db || !workspaceId) return [];
  const { collection, getDocs, query, where } = await firestoreTools();
  const snap = await getDocs(query(collection(firebase.db, collectionName), where('workspaceId', '==', workspaceId)));
  const rows = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return rows.sort((a, b) => {
    const stampA = new Date(a.createdAt || a.created_at || a.updatedAt || a.updated_at || 0).getTime();
    const stampB = new Date(b.createdAt || b.created_at || b.updatedAt || b.updated_at || 0).getTime();
    if (stampA !== stampB) return stampA - stampB;
    return String(a.title || a.name || a.id).localeCompare(String(b.title || b.name || b.id));
  });
}

export async function loadWorkspace(firebase) {
  if (!firebase?.db) return null;
  const { collection, getDocs, query } = await firestoreTools();
  const snap = await getDocs(query(collection(firebase.db, 'workspaces')));
  const doc = snap.docs[0];
  return doc ? { id: doc.id, ...doc.data() } : null;
}
