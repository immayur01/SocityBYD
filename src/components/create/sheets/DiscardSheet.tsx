import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';

interface DiscardSheetProps {
  visible: boolean;
  onDiscard: () => void;
  onSaveDraft: () => void;
  onKeepEditing: () => void;
}

export const DiscardSheet: React.FC<DiscardSheetProps> = ({
  visible,
  onDiscard,
  onSaveDraft,
  onKeepEditing,
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onKeepEditing}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onKeepEditing}>
        <TouchableOpacity style={styles.sheetContainer} activeOpacity={1} onPress={() => {}}>
          <View style={styles.handle} />

          <Text style={styles.title}>Discard draft?</Text>
          <Text style={styles.subtitle}>
            If you leave now, you can save your draft to resume later or discard your changes.
          </Text>

          <View style={styles.actions}>
            {/* Destructive Discard */}
            <TouchableOpacity style={styles.discardBtn} onPress={onDiscard} activeOpacity={0.8}>
              <Text style={styles.discardBtnText}>Discard Post</Text>
            </TouchableOpacity>

            {/* Save Draft */}
            <TouchableOpacity style={styles.saveBtn} onPress={onSaveDraft} activeOpacity={0.8}>
              <Text style={styles.saveBtnText}>Save Draft</Text>
            </TouchableOpacity>

            {/* Keep Editing */}
            <TouchableOpacity style={styles.cancelBtn} onPress={onKeepEditing} activeOpacity={0.8}>
              <Text style={styles.cancelBtnText}>Keep Editing</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#121212',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 32,
    alignItems: 'center',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 16,
  },
  title: {
    color: '#F5F5F5',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  actions: {
    width: '100%',
    gap: 10,
  },
  discardBtn: {
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  discardBtnText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  saveBtn: {
    height: 46,
    borderRadius: 14,
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#F5F5F5',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelBtn: {
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
});
