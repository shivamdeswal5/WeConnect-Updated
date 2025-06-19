'use client';
import { db } from '@/firebase/firebase';
import { RootState } from '@/store';
import { addMessage } from '@/store/chatSlice';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import SendIcon from '@mui/icons-material/Send';
import {
  Avatar,
  Box,
  IconButton,
  Popover,
  Typography,
} from '@mui/material';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import {
  get,
  limitToLast,
  onChildAdded,
  onDisconnect,
  onValue,
  orderByChild,
  query,
  ref,
  startAt,
  endAt,
  push,
  set,
} from 'firebase/database';
import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import StarterKit from '@tiptap/starter-kit';
import {
  MenuButtonBold,
  MenuButtonItalic,
  MenuControlsContainer,
  MenuDivider,
  MenuSelectHeading,
  RichTextEditor,
  type RichTextEditorRef,
} from 'mui-tiptap';

interface IMessage {
  text: string;
  senderId: string;
  timestamp: number;
}

const MESSAGES_BATCH_SIZE = 20;

const Chat = () => {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('Offline');
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const editorRef = useRef<RichTextEditorRef>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const oldestTimestampRef = useRef<number | null>(null);
  const dispatch = useDispatch();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingStartedRef = useRef(false);

  const currentChatId = useSelector((state: RootState) => state.chat.currentChatId);
  const currentUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
  const selectedUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('selectedUser') || '{}') : {};

  useEffect(() => {
    if (!currentUser?.uid) return;
    const userRef = ref(db, `onlineUsers/${currentUser.uid}`);
    set(userRef, true);
    onDisconnect(userRef).set(false);
  }, []);

  // useEffect(() => {
  //   if (!currentChatId) return;

  //   const msgRef = query(
  //     ref(db, `messages/${currentChatId}`),
  //     orderByChild('timestamp'),
  //     limitToLast(MESSAGES_BATCH_SIZE)
  //   );

  //   get(msgRef).then((snapshot) => {
  //     const data: IMessage[] = [];
  //     snapshot.forEach((child) => {
  //       data.push(child.val());
  //     });

  //     if (data.length > 0) {
  //       const sorted = data.sort((a, b) => a.timestamp - b.timestamp);
  //       oldestTimestampRef.current = sorted[0].timestamp;
  //       setMessages(sorted);
  //       dispatch(addMessage(sorted[sorted.length - 1]));


  //       const liveMsgRef = query(
  //         ref(db, `messages/${currentChatId}`),
  //         orderByChild('timestamp'),
  //         startAt(sorted[sorted.length - 1].timestamp + 1)
  //       );

  //       onChildAdded(liveMsgRef, (snapshot) => {
  //         const newMessage = snapshot.val() as IMessage;
  //         setMessages((prev) => [...prev, newMessage]);
  //         dispatch(addMessage(newMessage));
  //         scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  //       });

  //       setTimeout(() => {
  //         scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  //       }, 100);
  //     } else {
  //       setHasMore(false);
  //     }
  //   });

  //   const unreadRef = ref(db, `unreadMessages/${currentUser.uid}/${currentChatId}`);
  //   set(unreadRef, 0);

  //   return () => {
  //     setMessages([]);
  //     oldestTimestampRef.current = null;
  //     setHasMore(true);
  //   };
  // }, [currentChatId]);

  // useEffect(() => {
  //   if (!currentChatId || !currentUser?.uid) return;

  //   const chatRef = query(
  //     ref(db, `messages/${currentChatId}`),
  //     orderByChild('timestamp'),
  //     limitToLast(MESSAGES_BATCH_SIZE)
  //   );

  //   const messagesSet = new Set<string>();
  //   const tempMessages: IMessage[] = [];

  //   const unsubscribe = onChildAdded(chatRef, (snapshot) => {
  //     const msg = snapshot.val() as IMessage;
  //     const msgId = snapshot.key;

  //     if (msgId && !messagesSet.has(msgId)) {
  //       messagesSet.add(msgId);
  //       tempMessages.push(msg);
  //       setMessages((prev) => [...prev, msg]);

  //       scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  //       dispatch(addMessage(msg));
  //     }
  //   });


  //   const unreadRef = ref(db, `unreadMessages/${currentUser.uid}/${currentChatId}`);
  //   set(unreadRef, 0);

  //   return () => {
  //     setMessages([]);
  //     oldestTimestampRef.current = null;
  //     setHasMore(true);
  //     unsubscribe(); 
  //   };
  // }, [currentChatId]);

  useEffect(() => {
    if (!currentChatId) return;

    let liveListenerUnsub: (() => void) | null = null;

    const fetchInitialAndListen = async () => {
      const msgRef = query(
        ref(db, `messages/${currentChatId}`),
        orderByChild('timestamp'),
        limitToLast(MESSAGES_BATCH_SIZE)
      );

      const snapshot = await get(msgRef);
      const initialMessages: IMessage[] = [];
      snapshot.forEach((child) => {
        initialMessages.push(child.val());
      });

      if (initialMessages.length > 0) {
        const sorted = initialMessages.sort((a, b) => a.timestamp - b.timestamp);
        oldestTimestampRef.current = sorted[0].timestamp;
        setMessages(sorted);
        dispatch(addMessage(sorted[sorted.length - 1]));

        setTimeout(() => {
          scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);

        const lastTimestamp = sorted[sorted.length - 1].timestamp;

        const liveQuery = query(
          ref(db, `messages/${currentChatId}`),
          orderByChild('timestamp'),
          startAt(lastTimestamp + 1)
        );

        liveListenerUnsub = onChildAdded(liveQuery, (snapshot) => {
          const newMsg = snapshot.val() as IMessage;
          setMessages((prev) => [...prev, newMsg]);
          dispatch(addMessage(newMsg));
          scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
        });
      } else {
        setHasMore(false);
      }

      const unreadRef = ref(db, `unreadMessages/${currentUser.uid}/${currentChatId}`);
      set(unreadRef, 0);
    };

    fetchInitialAndListen();

    return () => {
      setMessages([]);
      oldestTimestampRef.current = null;
      setHasMore(true);
      if (liveListenerUnsub) liveListenerUnsub();
    };
  }, [currentChatId]);

  const fetchInitialMessages = async () => {
    const msgRef = query(
      ref(db, `messages/${currentChatId}`),
      orderByChild('timestamp'),
      limitToLast(MESSAGES_BATCH_SIZE)
    );

    get(msgRef).then((snapshot) => {
      const data: IMessage[] = [];
      snapshot.forEach((child) => {
        const val = child.val();
        data.push(val);
      });

      if (data.length > 0) {
        const sorted = data.sort((a, b) => a.timestamp - b.timestamp);
        oldestTimestampRef.current = sorted[0].timestamp;
        setMessages(sorted);
        dispatch(addMessage(sorted[sorted.length - 1]));

        setTimeout(() => {
          scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        setHasMore(false);
      }
    });
  };

  const loadOlderMessages = async () => {
    if (!hasMore || loadingMore || !oldestTimestampRef.current) return;
    setLoadingMore(true);

    const chatRef = query(
      ref(db, `messages/${currentChatId}`),
      orderByChild('timestamp'),
      endAt(oldestTimestampRef.current - 1),
      limitToLast(MESSAGES_BATCH_SIZE)
    );

    const prevScrollHeight = chatBoxRef.current?.scrollHeight || 0;

    const snapshot = await get(chatRef);
    const older: IMessage[] = [];
    snapshot.forEach((child) => {
      older.push(child.val());
    });

    if (older.length > 0) {
      const sorted = older.sort((a, b) => a.timestamp - b.timestamp);
      oldestTimestampRef.current = sorted[0].timestamp;
      setMessages((prev) => [...sorted, ...prev]);
    } else {
      setHasMore(false);
    }

    setTimeout(() => {
      const newScrollHeight = chatBoxRef.current?.scrollHeight || 0;
      chatBoxRef.current?.scrollTo(0, newScrollHeight - prevScrollHeight);
    }, 50);

    setLoadingMore(false);
  };

  // const loadOlderMessages = async () => {
  //   if (!hasMore || loadingMore || !oldestTimestampRef.current) return;
  //   setLoadingMore(true);
  //   const chatRef = query(
  //     ref(db, `messages/${currentChatId}`),
  //     orderByChild('timestamp'),
  //     endAt(oldestTimestampRef.current - 1),
  //     limitToLast(MESSAGES_BATCH_SIZE)
  //   );

  //   const prevScrollHeight = chatBoxRef.current?.scrollHeight || 0;

  //   get(chatRef).then((snapshot) => {
  //     const older: IMessage[] = [];
  //     snapshot.forEach((child) => {
  //       const val = child.val();
  //       older.push(val);
  //     });

  //     if (older.length > 0) {
  //       const sorted = older.sort((a, b) => a.timestamp - b.timestamp);
  //       oldestTimestampRef.current = sorted[0].timestamp;
  //       setMessages((prev) => [...sorted, ...prev]);
  //     } else {
  //       setHasMore(false);
  //     }

  //     setTimeout(() => {
  //       const newScrollHeight = chatBoxRef.current?.scrollHeight || 0;
  //       chatBoxRef.current?.scrollTo(0, newScrollHeight - prevScrollHeight);
  //     }, 50);

  //     setLoadingMore(false);
  //   });
  // };

  useEffect(() => {
    if (!selectedUser?.uid || !currentChatId || !currentUser?.uid) return;

    const statusRef = ref(db, `onlineUsers/${selectedUser.uid}`);
    const unsubscribeStatus = onValue(statusRef, (snapshot) => {
      setStatus(snapshot.val() ? 'Online' : 'Offline');
    });

    const typingRef = ref(db, `typingStatus/${currentChatId}/${selectedUser.uid}`);
    const unsubscribeTyping = onValue(typingRef, (snapshot) => {
      const isTyping = snapshot.val();
      if (isTyping) setStatus('Typing...');
      else {
        const onlineRef = ref(db, `onlineUsers/${selectedUser.uid}`);
        onValue(onlineRef, (snap) => {
          setStatus(snap.val() ? 'Online' : 'Offline');
        }, { onlyOnce: true });
      }
    });

    return () => {
      unsubscribeStatus();
      unsubscribeTyping();
    };
  }, [selectedUser?.uid, currentChatId]);

  const handleTyping = () => {
    if (!currentChatId || !currentUser?.uid) return;
    const typingRef = ref(db, `typingStatus/${currentChatId}/${currentUser.uid}`);

    if (!typingStartedRef.current) {
      set(typingRef, true);
      typingStartedRef.current = true;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      set(typingRef, false);
      typingStartedRef.current = false;
    }, 2000);
  };

  // const handleSend = () => {
  //   const plainText = editorRef.current?.editor?.getText().trim();
  //   const htmlContent = editorRef.current?.editor?.getHTML();
  //   if (!plainText || !currentChatId || !currentUser?.uid) return;

  //   const newMsg: IMessage = {
  //     text: htmlContent ?? '',
  //     senderId: currentUser.uid,
  //     timestamp: Date.now(),
  //   };

  //   const chatRef = ref(db, `messages/${currentChatId}`);
  //   push(chatRef, newMsg);
  //   set(ref(db, `lastMessages/${currentChatId}`), {
  //     ...newMsg,
  //     receiverId: selectedUser.uid,
  //   });

  //   const unreadRef = ref(db, `unreadMessages/${selectedUser.uid}/${currentChatId}`);
  //   get(unreadRef).then((snap) => {
  //     const currentCount = snap.val() || 0;
  //     set(unreadRef, currentCount + 1);
  //   });

  //   setMessage('');
  //   editorRef.current?.editor?.commands.clearContent();
  // };

  const handleSend = () => {
    const plainText = editorRef.current?.editor?.getText().trim();
    const htmlContent = editorRef.current?.editor?.getHTML();
    if (!plainText || !currentChatId || !currentUser?.uid) return;

    const newMsg: IMessage = {
      text: htmlContent ?? '',
      senderId: currentUser.uid,
      timestamp: Date.now(),
    };

    const chatRef = ref(db, `messages/${currentChatId}`);
    push(chatRef, newMsg); 

    set(ref(db, `lastMessages/${currentChatId}`), {
      ...newMsg,
      receiverId: selectedUser.uid,
    });

    const unreadRef = ref(db, `unreadMessages/${selectedUser.uid}/${currentChatId}`);
    get(unreadRef).then((snap) => {
      const currentCount = snap.val() || 0;
      set(unreadRef, currentCount + 1);
    });

    setMessage('');
    editorRef.current?.editor?.commands.clearContent();
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    editorRef.current?.editor?.commands.insertContent(emojiData.emoji);
  };

  return (
    <Box flex={3} display="flex" flexDirection="column" height="100vh" width="100%">
      {currentChatId ? (
        <>
         
          <Box display="flex" alignItems="center" px={2} py={1} borderBottom="1px solid #ccc" bgcolor="#f5f5f5">
            <Avatar src={selectedUser.photoURL || ''} />
            <Box ml={2}>
              <Typography variant="subtitle1">
                {selectedUser.displayName || selectedUser.name || selectedUser.email}
              </Typography>
              <Typography variant="caption" color={status === 'Online' || status === 'Typing...' ? 'green' : 'textSecondary'}>
                {status}
              </Typography>
            </Box>
          </Box>

          
          <Box
            ref={chatBoxRef}
            flex={1}
            p={2}
            overflow="auto"
            sx={{ backgroundColor: '#fafafa', display: 'flex', flexDirection: 'column', gap: '8px' }}
            onScroll={(e) => {
              if (e.currentTarget.scrollTop === 0 && hasMore) {
                loadOlderMessages();
              }
            }}
          >
            {messages.map((msg, index) => (
              <Box
                key={index}
                alignSelf={msg.senderId === currentUser.uid ? 'flex-end' : 'flex-start'}
                bgcolor={msg.senderId === currentUser.uid ? '#DCF8C6' : '#d2d4cff9'}
                p={1.2}
                borderRadius={2}
                maxWidth="70%"
                sx={{ wordBreak: 'break-word' }}
              >
                <div dangerouslySetInnerHTML={{ __html: msg.text }} style={{ fontSize: '14px' }} />
              </Box>
            ))}
            <div ref={scrollRef} />
          </Box>

         
          <Box px={2} py={1} borderTop="1px solid #ccc" bgcolor="#f5f5f5">
            <RichTextEditor
              ref={editorRef}
              content=""
              extensions={[StarterKit]}
              onUpdate={({ editor }) => {
                setMessage(editor.getHTML());
                handleTyping();
              }}
              editorProps={{
                handleKeyDown: (_view, event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
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
          <Typography variant="h6" color="textSecondary">Select a contact to start chatting</Typography>
        </Box>
      )}
    </Box>
  );
};

export default Chat;