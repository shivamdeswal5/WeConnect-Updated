"use client";

import { db } from "@/firebase/firebase";
import { fetchUsersBatch } from "@/firebase/user-service";
import { setCurrentChatId } from "@/store/chatSlice";
import SearchIcon from "@mui/icons-material/Search";
import {
  Avatar,
  Badge,
  Box,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";
import { get, onValue, ref } from "firebase/database";
import { useEffect, useRef, useState } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { useDispatch } from "react-redux";
import { format, isYesterday, isToday } from "date-fns";

interface IUser {
  uid?: string;
  email?: string;
  photoURL?: string;
  displayName?: string;
  lastMessage?: string;
  unreadCount?: number;
  lastMessageTime?: number;
  isOnline?: boolean;
}

const Contacts = () => {
  const [users, setUsers] = useState<IUser[]>([]);
  const [search, setSearch] = useState("");
  const [lastEmail, setLastEmail] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const listenersMap = useRef<Map<string, () => void>>(new Map());
  const LIMIT = 10;

  const dispatch = useDispatch();

  const currentUser =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("user") || "{}")
      : {};

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    setUsers([]);
    setLastEmail(null);
    setHasMore(true);
  };

  const handleContactClick = (contact: IUser) => {
    if (!currentUser.uid || !contact.uid) return;
    const chatId = [currentUser.uid, contact.uid].sort().join("_");
    localStorage.setItem("currentChatId", JSON.stringify(chatId));
    dispatch(setCurrentChatId(chatId));
    localStorage.setItem("selectedUser", JSON.stringify(contact));
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    if (isToday(date)) return format(date, "h:mm a");
    if (isYesterday(date)) return "Yesterday";
    return format(date, "dd/MM/yyyy");
  };

  const fetchNextBatch = async () => {
    setIsFetchingMore(true);
    const fetched = await fetchUsersBatch(currentUser.uid, lastEmail, LIMIT, search);

    if (fetched.length === 0) {
      setHasMore(false);
      setIsFetchingMore(false);
      setInitialLoading(false);
      return;
    }

    const updatedUsers = await Promise.all(
      fetched.map(async (user) => {
        const chatId = [currentUser.uid, user.uid].sort().join("_");
        const lastMsgRef = ref(db, `lastMessages/${chatId}`);
        const unreadRef = ref(db, `unreadMessages/${currentUser.uid}/${chatId}`);
        const statusRef = ref(db, `status/${user.uid}`);

        const [lastMsgSnap, unreadSnap, statusSnap] = await Promise.all([
          get(lastMsgRef),
          get(unreadRef),
          get(statusRef),
        ]);

        const lastMessage = lastMsgSnap.val()?.text || "";
        const timestamp = lastMsgSnap.val()?.timestamp || 0;
        const unreadCount = unreadSnap.val() || 0;
        const isOnline = statusSnap.val()?.state === "online";

        return {
          ...user,
          lastMessage,
          lastMessageTime: timestamp,
          unreadCount,
          isOnline,
        };
      })
    );

    setUsers((prev) => {
      const uidMap = new Map<string, IUser>();
      [...prev, ...updatedUsers].forEach((user) => {
        if (user.uid) uidMap.set(user.uid, user);
      });
      const sorted = Array.from(uidMap.values()).sort(
        (a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0)
      );
      return sorted;
    });

    setLastEmail(fetched[fetched.length - 1].email);
    setIsFetchingMore(false);
    setInitialLoading(false);
  };

  useEffect(() => {
    if (currentUser.uid) {
      fetchNextBatch();
    }

    return () => {
      listenersMap.current.forEach((unsubscribe) => unsubscribe());
      listenersMap.current.clear();
      setUsers([]);
      setLastEmail(null);
      setHasMore(true);
    };
  }, [currentUser.uid, search]);

  useEffect(() => {
    // Remove previous listeners before setting new ones
    listenersMap.current.forEach((unsub) => unsub());
    listenersMap.current.clear();

    users.forEach((user) => {
      if (!user.uid) return;
      const chatId = [currentUser.uid, user.uid].sort().join("_");

      const lastMsgRef = ref(db, `lastMessages/${chatId}`);
      const unreadRef = ref(db, `unreadMessages/${currentUser.uid}/${chatId}`);
      const statusRef = ref(db, `status/${user.uid}`);

      const unsub1 = onValue(lastMsgRef, (snapshot) => {
        const data = snapshot.val();
        setUsers((prev) =>
          prev.map((u) =>
            u.uid === user.uid
              ? {
                  ...u,
                  lastMessage: data?.text || "",
                  lastMessageTime: data?.timestamp || 0,
                }
              : u
          )
        );
      });

      const unsub2 = onValue(unreadRef, (snapshot) => {
        const count = snapshot.val() || 0;
        setUsers((prev) =>
          prev.map((u) =>
            u.uid === user.uid ? { ...u, unreadCount: count } : u
          )
        );
      });

      const unsub3 = onValue(statusRef, (snapshot) => {
        const isOnline = snapshot.val()?.state === "online";
        setUsers((prev) =>
          prev.map((u) =>
            u.uid === user.uid ? { ...u, isOnline } : u
          )
        );
      });

      listenersMap.current.set(`last-${user.uid}`, () => unsub1());
      listenersMap.current.set(`unread-${user.uid}`, () => unsub2());
      listenersMap.current.set(`status-${user.uid}`, () => unsub3());
    });
  }, [users.map((u) => u.uid).join(",")]); 

  return (
    <Box display="flex" flexDirection="column" height="100vh" sx={{ width: "400px", borderRight: "1px solid #ccc", boxSizing: "border-box", px: 2, pt: 2 }}>
      <Typography variant="h4">Messages</Typography>

      <TextField
        fullWidth
        placeholder="Search users..."
        variant="outlined"
        onChange={handleSearch}
        value={search}
        sx={{ my: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />

      <Box flex={1} overflow="auto" pr={1} id="scrollableDiv" sx={{ "&::-webkit-scrollbar": { display: "none" } }}>
        <InfiniteScroll
          dataLength={users.length}
          next={fetchNextBatch}
          hasMore={hasMore}
          scrollableTarget="scrollableDiv"
          loader={<Typography textAlign="center" py={1}>{(initialLoading || isFetchingMore) && "Loading..."}</Typography>}
          endMessage={<Typography textAlign="center" py={2} color="textSecondary">No more contacts</Typography>}
        >
          {users.map((item) => (
            <Box
              key={item.uid}
              display="flex"
              alignItems="center"
              padding="10px"
              borderBottom="1px solid #ccc"
              sx={{ cursor: "pointer" }}
              onClick={() => handleContactClick(item)}
            >
              <Badge
                color="error"
                badgeContent={item.unreadCount || 0}
                invisible={!item.unreadCount}
                overlap="circular"
              >
                <Badge
                  color="success"
                  variant="dot"
                  overlap="circular"
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  invisible={!item.isOnline}
                >
                  <Avatar src={item.photoURL || ""} sx={{ mr: 1.5 }} />
                </Badge>
              </Badge>

              <Box flex="1">
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body1">
                    {item.displayName || item.email?.split("@")[0]}
                  </Typography>
                  {item.lastMessage && item.lastMessageTime && (
                    <Typography variant="caption" color="textSecondary" sx={{ ml: 1, whiteSpace: "nowrap" }}>
                      {formatTimestamp(item.lastMessageTime)}
                    </Typography>
                  )}
                </Box>
                <Typography
                  variant="caption"
                  color="textSecondary"
                  noWrap
                  dangerouslySetInnerHTML={{ __html: item.lastMessage || "No messages yet" }}
                  sx={{ maxWidth: "200px" }}
                />
              </Box>
            </Box>
          ))}
        </InfiniteScroll>
      </Box>
    </Box>
  );
};

export default Contacts