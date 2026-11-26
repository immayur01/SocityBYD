import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { X, Pin, Check } from 'lucide-react-native';

export type PinOption = 'Off' | '24 Hours' | '7 Days';

interface PinSheetProps {
  visible: boolean;
  currentValue: PinOption;
  onSelect: (option: PinOption) => void;
  onClose: () => void;
}

export const PinSheet: React.FC<PinSheetProps> = ({
  visible,
  currentValue,
  onSelect,
  onClose,
}) => {
  const options: { value: PinOption; label: string; sub: string }[] = [
    { value: 'Off', label: 'Off', sub: 'Standard feed placement' },
    { value: '24 Hours', label: '24 Hours', sub: 'Keeps notice pinned at top for 1 day' },
    { value: '7 Days', label: '7 Days', sub: 'Keeps notice pinned at top for 1 week' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.sheetContainer} activeOpacity={1} onPress={() => {}}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Pin size={17} strokeWidth={1.5} color="#F5F5F5" style={{ marginRight: 8 }} />
              <Text style={styles.title}>Pin to Top</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={18} strokeWidth={1.5} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <View style={styles.optionsList}>
            {options.map((opt) => {
              const isSelected = currentValue === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.row, isSelected && styles.rowActive]}
                  onPress={() => {
                    onSelect(opt.value);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.details}>
                    <Text style={[styles.label, isSelected && styles.labelActive]}>
                      {opt.label}
                    </Text>
                    <Text style={styles.sub}>{opt.sub}</Text>
                  </View>
                  {isSelected && <Check size={16} strokeWidth={2.5} color="#F5F5F5" />}
                </TouchableOpacity>
              );
            })}
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
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    color: '#F5F5F5',
    fontSize: 16,
    fontWeight: '600',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsList: {
    marginTop: 8,
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  rowActive: {
    backgroundColor: '#1A1A1A',
  },
  details: {
    flex: 1,
    gap: 2,
  },
  label: {
    color: '#D1D5DB',
    fontSize: 14,
    fontWeight: '500',
  },
  labelActive: {
    color: '#F5F5F5',
    fontWeight: '600',
  },
  sub: {
    color: '#6B7280',
    fontSize: 11,
  },
});
