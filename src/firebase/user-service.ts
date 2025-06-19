import { get, limitToFirst, onValue, orderByChild, query, ref, startAfter, startAt, endAt } from "firebase/database";
import { db } from "./firebase";

export function fetchAllUsers(currentUid: string, callback: (users: any[]) => void) {
  const usersRef = ref(db, "users");

  onValue(usersRef, (snapshot) => {
    const data = snapshot.val();
    const users = data
      ? Object.values(data).filter((user: any) => user.uid !== currentUid)
      : [];
    callback(users);
  });
}


export async function fetchUsersBatch(
  currentUid: string,
  lastEmail: string | null,
  limit: number,
  searchQuery: string = ""
) {
  const usersRef = ref(db, "users");

  let q = query(usersRef, orderByChild("email"));

  if (searchQuery) {
    const start = searchQuery;
    const end = searchQuery + "\uf8ff";
    q = query(usersRef, orderByChild("email"), startAt(start), endAt(end));
  }

  if (lastEmail && !searchQuery) {
    q = query(usersRef, orderByChild("email"), startAt(lastEmail));
  }

  const snap = await get(q);

  const users: any[] = [];
  snap.forEach((child) => {
    const user = child.val();
    if (user.uid !== currentUid) {
      users.push(user);
    }
  });

  return users.slice(0, limit);
}

fetchUsersBatch("FV3Iif0mIKQExAS2t6KJz8W300g1", null, 10).then(users => {
  console.log("User Data In Batch: ", users);
});