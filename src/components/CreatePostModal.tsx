import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { island } from '@/context/IslandContext';
import {
  uploadQueue,
  AttachedMediaItem,
  AttachedDocumentItem,
  UploadTaskPayload,
} from '@/services/uploadQueue';
import { MediaPickerStep } from './create/MediaPickerStep';
import { UnifiedComposerStep } from './create/UnifiedComposerStep';
import { ModeSwitcher, CreatePostMode } from './create/ModeSwitcher';
import { DiscardSheet } from './create/sheets/DiscardSheet';

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  onPostCreated?: () => void;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  visible,
  onClose,
  onPostCreated,
}) => {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  // Mode: 'POST' | 'EVENT' | 'NOTICE'
  const [mode, setMode] = useState<CreatePostMode>('POST');

  // Step: 1 = Media Picker, 2 = Unified Composer
  const [step, setStep] = useState<1 | 2>(1);

  // Draft State
  const [mediaItems, setMediaItems] = useState<AttachedMediaItem[]>([]);
  const [documentItem, setDocItem] = useState<AttachedDocumentItem | null>(null);
  const [caption, setCaption] = useState<string>('');

  // Discard protection sheet
  const [showDiscardSheet, setShowDiscardSheet] = useState(false);

  // Check saved draft on open
  useEffect(() => {
    if (visible) {
      uploadQueue.loadDraft().then((draft) => {
        if (draft) {
          setMode(draft.mode);
          setCaption(draft.caption || '');
          setMediaItems(draft.mediaItems || []);
          setDocItem(draft.documentItem || null);
          setStep(draft.mode === 'POST' && draft.mediaItems.length === 0 ? 1 : 2);
        }
      });
    }
  }, [visible]);

  // Reset form helper
  const resetForm = useCallback(() => {
    setMode('POST');
    setStep(1);
    setMediaItems([]);
    setDocItem(null);
    setCaption('');
    setShowDiscardSheet(false);
  }, []);

  // Is draft dirty (contains unsaved changes)
  const isDirty =
    mediaItems.length > 0 ||
    caption.trim().length > 0 ||
    !!documentItem;

  // Attempt close with discard protection
  const handleAttemptClose = () => {
    if (isDirty) {
      setShowDiscardSheet(true);
    } else {
      resetForm();
      onClose();
    }
  };

  // Discard Post
  const handleDiscard = async () => {
    setShowDiscardSheet(false);
    await uploadQueue.clearDraft();
    resetForm();
    onClose();
  };

  // Save Draft
  const handleSaveDraft = async () => {
    setShowDiscardSheet(false);
    await uploadQueue.saveDraft({
      mode,
      caption,
      mediaItems,
      documentItem,
      audience: 'All Residents',
      allowComments: true,
    });
    island.info('Draft Saved', 'You can resume editing next time.');
    resetForm();
    onClose();
  };

  // Mode Selection from bottom switcher
  const handleSelectMode = (newMode: CreatePostMode) => {
    setMode(newMode);
    if (newMode === 'EVENT' || newMode === 'NOTICE') {
      setStep(2);
    } else {
      // POST mode: if already has media, stay on step 2, else step 1
      if (mediaItems.length === 0) {
        setStep(1);
      }
    }
  };

  // Submit Post / Event / Notice
  const handleSubmit = (payload: UploadTaskPayload) => {
    // 1. Close modal immediately (do NOT block resident inside composer)
    onClose();
    resetForm();

    // 2. Start background upload via queue & dynamic island
    uploadQueue.enqueueUpload(payload);

    if (onPostCreated) {
      onPostCreated();
    }
  };

  const safeTopPadding = Math.max(insets.top, StatusBar.currentHeight ?? 38);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent={true}
      onRequestClose={handleAttemptClose}
    >
      <StatusBar
        barStyle="light-content"
        translucent={true}
        backgroundColor="transparent"
      />

      <View style={[styles.modalRoot, { paddingTop: safeTopPadding }]}>
        {/* Render Step 1 (Media Picker for POST mode) */}
        {mode === 'POST' && step === 1 ? (
          <MediaPickerStep
            selectedMedia={mediaItems}
            onChangeSelectedMedia={setMediaItems}
            onNext={() => setStep(2)}
            onSkipTextOnly={() => setStep(2)}
            onClose={handleAttemptClose}
          />
        ) : (
          /* Render Step 2 (Unified Composer for POST, EVENT, NOTICE) */
          <UnifiedComposerStep
            mode={mode}
            mediaItems={mediaItems}
            onChangeMediaItems={setMediaItems}
            documentItem={documentItem}
            onChangeDocumentItem={setDocItem}
            caption={caption}
            onChangeCaption={setCaption}
            onBackToPicker={() => setStep(1)}
            onClose={handleAttemptClose}
            onSubmit={handleSubmit}
          />
        )}

        {/* Floating Apple-Style Liquid-Glass Mode Switcher */}
        <ModeSwitcher currentMode={mode} onSelectMode={handleSelectMode} />

        {/* Discard Protection Bottom Sheet */}
        <DiscardSheet
          visible={showDiscardSheet}
          onDiscard={handleDiscard}
          onSaveDraft={handleSaveDraft}
          onKeepEditing={() => setShowDiscardSheet(false)}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative',
  },
});
