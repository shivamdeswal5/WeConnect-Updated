'use client';

import {
  Box,
  Typography,
  Avatar,
  IconButton,
  Popover,
} from '@mui/material';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import SendIcon from '@mui/icons-material/Send';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import {
  ref,
  set,
  push,
  get,
  onChildAdded,
  query,
  orderByChild,
  limitToLast,
  endAt,
  startAt,
  onValue,
} from 'firebase/database';
import { db } from '@/firebase/firebase';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { addMessage } from '@/store/chatSlice';
import { useEffect, useRef, useState } from 'react';
import {
  RichTextEditor,
  type RichTextEditorRef,
  MenuControlsContainer,
  MenuButtonBold,
  MenuButtonItalic,
  MenuDivider,
  MenuSelectHeading,
} from 'mui-tiptap';
import StarterKit from '@tiptap/starter-kit';

interface IMessage {
  text: string;
  senderId: string;
  timestamp: number;
}

const MESSAGES_BATCH_SIZE = 20;

const Chat = () => {
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [status, setStatus] = useState('Offline');

  const dispatch = useDispatch();
  const currentChatId = useSelector((state: RootState) => state.chat.currentChatId);
  const currentUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
  const selectedUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('selectedUser') || '{}') : {};

  const scrollRef = useRef<HTMLDivElement>(null);
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<RichTextEditorRef>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const oldestTimestampRef = useRef<number | null>(null);

  // Typing status setup
  const handleTyping = () => {
    const typingRef = ref(db, `typingStatus/${currentChatId}/${currentUser.uid}`);
    set(typingRef, true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      set(typingRef, false);
    }, 2000);
  };

  useEffect(() => {
    if (!currentChatId || !currentUser?.uid) return;

    const msgRef = query(
      ref(db, `messages/${currentChatId}`),
      orderByChild('timestamp'),
      limitToLast(MESSAGES_BATCH_SIZE)
    );

    get(msgRef).then((snapshot) => {
      const data: IMessage[] = [];
      snapshot.forEach((child) => {
        data.push(child.val());
      });
      const sorted = data.sort((a, b) => a.timestamp - b.timestamp);
      setMessages(sorted);
      if (sorted.length > 0) oldestTimestampRef.current = sorted[0].timestamp;

      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });

      const liveQuery = query(
        ref(db, `messages/${currentChatId}`),
        orderByChild('timestamp'),
        startAt(sorted[sorted.length - 1]?.timestamp + 1 || Date.now())
      );

      onChildAdded(liveQuery, (snap) => {
        const newMsg = snap.val() as IMessage;
        setMessages((prev) => [...prev, newMsg]);
        dispatch(addMessage(newMsg));
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    });

    const unreadRef = ref(db, `unreadMessages/${currentUser.uid}/${currentChatId}`);
    set(unreadRef, 0);

    return () => {
      setMessages([]);
      oldestTimestampRef.current = null;
    };
  }, [currentChatId]);

  // Typing indicator shown to other user
  useEffect(() => {
    if (!currentChatId || !selectedUser?.uid) return;

    const typingRef = ref(db, `typingStatus/${currentChatId}/${selectedUser.uid}`);
    const onlineRef = ref(db, `onlineUsers/${selectedUser.uid}`);

    const unsubscribeTyping = onValue(typingRef, (snapshot) => {
      const isTyping = snapshot.val();
      if (isTyping) setStatus('Typing...');
      else {
        get(onlineRef).then((snap) => {
          setStatus(snap.val() ? 'Online' : 'Offline');
        });
      }
    });

    return () => {
      unsubscribeTyping();
    };
  }, [selectedUser?.uid, currentChatId]);

  const loadOlderMessages = async () => {
    if (!hasMore || loadingMore || !oldestTimestampRef.current) return;

    setLoadingMore(true);
    const prevHeight = chatBoxRef.current?.scrollHeight || 0;

    const chatRef = query(
      ref(db, `messages/${currentChatId}`),
      orderByChild('timestamp'),
      endAt(oldestTimestampRef.current - 1),
      limitToLast(MESSAGES_BATCH_SIZE)
    );

    const snapshot = await get(chatRef);
    const older: IMessage[] = [];
    snapshot.forEach((child) => { older.push(child.val()); });

    if (older.length > 0) {
      const sorted = older.sort((a, b) => a.timestamp - b.timestamp);
      oldestTimestampRef.current = sorted[0].timestamp;
      setMessages((prev) => [...sorted, ...prev]);
    } else {
      setHasMore(false);
    }

    setTimeout(() => {
      const newHeight = chatBoxRef.current?.scrollHeight || 0;
      chatBoxRef.current?.scrollTo(0, newHeight - prevHeight);
    }, 50);

    setLoadingMore(false);
  };

  const handleSend = () => {
    const text = editorRef.current?.editor?.getText().trim();
    const html = editorRef.current?.editor?.getHTML();

    if (!text || !currentChatId || !currentUser?.uid) return;

    const newMsg: IMessage = {
      text: html || '',
      senderId: currentUser.uid,
      timestamp: Date.now(),
    };

    push(ref(db, `messages/${currentChatId}`), newMsg);
    set(ref(db, `lastMessages/${currentChatId}`), {
      ...newMsg,
      receiverId: selectedUser.uid,
    });

    const unreadRef = ref(db, `unreadMessages/${selectedUser.uid}/${currentChatId}`);
    get(unreadRef).then((snap) => {
      const count = snap.val() || 0;
      set(unreadRef, count + 1);
    });

    editorRef.current?.editor?.commands.clearContent();
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    editorRef.current?.editor?.commands.insertContent(emojiData.emoji);
  };

  return (
    <Box flex={3} display="flex" flexDirection="column" height="100vh">
      {currentChatId ? (
        <>
          <Box display="flex" alignItems="center" px={2} py={1} borderBottom="1px solid #ccc">
            <Avatar src={selectedUser.photoURL || ''} />
            <Box ml={2}>
              <Typography variant="subtitle1">{selectedUser.displayName || selectedUser.name || selectedUser.email}</Typography>
              <Typography variant="caption" color={status === 'Offline' ? 'text.Secondary' : 'green'}>
                {status}
              </Typography>
            </Box>
          </Box>

          <Box
            ref={chatBoxRef}
            flex={1}
            overflow="auto"
            p={2}
            sx={{ display: 'flex', flexDirection: 'column', gap: 1, background: '#f5f5f5' }}
            onScroll={(e) => {
              if (e.currentTarget.scrollTop === 0 && hasMore) loadOlderMessages();
            }}
          >
            {messages.map((msg, i) => (
              <Box
                key={i}
                alignSelf={msg.senderId === currentUser.uid ? 'flex-end' : 'flex-start'}
                bgcolor={msg.senderId === currentUser.uid ? '#DCF8C6' : '#fff'}
                p={1.5}
                borderRadius={2}
                maxWidth="70%"
                sx={{ wordBreak: 'break-word' }}
              >
                <div dangerouslySetInnerHTML={{ __html: msg.text }} />
              </Box>
            ))}
            <div ref={scrollRef} />
          </Box>

          <Box px={2} py={1} borderTop="1px solid #ccc" bgcolor="#f9f9f9">
            <RichTextEditor
              ref={editorRef}
              content=""
              extensions={[StarterKit]}
              onUpdate={() => handleTyping()}
              editorProps={{
                handleKeyDown: (_, e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                    return true;
                  }
                  return false;
                },
              }}
              renderControls={() => (
                <MenuControlsContainer>
                  <MenuSelectHeading />
                  <MenuDivider />
                  <MenuButtonBold />
                  <MenuButtonItalic />
                  <MenuDivider />
                  <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
                    <EmojiEmotionsIcon />
                  </IconButton>
                  <IconButton onClick={handleSend}>
                    <SendIcon />
                  </IconButton>
                </MenuControlsContainer>
              )}
            />
            <Popover
              open={Boolean(anchorEl)}
              anchorEl={anchorEl}
              onClose={() => setAnchorEl(null)}
              anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
              transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            >
              <EmojiPicker onEmojiClick={handleEmojiClick} height={350} />
            </Popover>
          </Box>
        </>
      ) : (
        <Box flex={1} display="flex" alignItems="center" justifyContent="center">
          <Typography>Select a contact to start chatting</Typography>
        </Box>
      )}
    </Box>
  );
};

export default Chat;