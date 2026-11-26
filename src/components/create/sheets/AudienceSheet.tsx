import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Check, X, Users, Home, Building2, ShieldCheck } from 'lucide-react-native';

export interface AudienceSelection {
  type: 'All Residents' | 'My Building Only' | 'Specific Buildings' | 'Committee Only';
  specificBuildings?: string[];
}

interface AudienceSheetProps {
  visible: boolean;
  currentValue: AudienceSelection;
  onSelect: (selection: AudienceSelection) => void;
  onClose: () => void;
}

const BUILDINGS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

export const AudienceSheet: React.FC<AudienceSheetProps> = ({
  visible,
  currentValue,
  onSelect,
  onClose,
}) => {
  const [selectedType, setSelectedType] = useState<AudienceSelection['type']>(currentValue.type);
  const [selectedBuildings, setSelectedBuildings] = useState<string[]>(
    currentValue.specificBuildings || ['A', 'B']
  );

  const toggleBuilding = (b: string) => {
    setSelectedBuildings((prev) =>
      prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]
    );
  };

  const handleApply = () => {
    onSelect({
      type: selectedType,
      specificBuildings: selectedType === 'Specific Buildings' ? selectedBuildings : undefined,
    });
    onClose();
  };

  const options: { type: AudienceSelection['type']; label: string; sub: string; icon: any }[] = [
    {
      type: 'All Residents',
      label: 'All Residents',
      sub: 'Visible to everyone in Ashtavinayak Empire',
      icon: Users,
    },
    {
      type: 'My Building Only',
      label: 'My Building Only',
      sub: 'Only residents of Wing A',
      icon: Home,
    },
    {
      type: 'Specific Buildings',
      label: 'Specific Buildings',
      sub: 'Select individual wings (A–J)',
      icon: Building2,
    },
    {
      type: 'Committee Only',
      label: 'Committee Only',
      sub: 'Management committee and admin members',
      icon: ShieldCheck,
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.sheetContainer} activeOpacity={1} onPress={() => {}}>
          {/* Grab Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Audience</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={18} strokeWidth={1.5} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Options */}
          <View style={styles.optionsList}>
            {options.map((item) => {
              const isSelected = selectedType === item.type;
              const Icon = item.icon;
              return (
                <TouchableOpacity
                  key={item.type}
                  style={[styles.optionRow, isSelected && styles.optionRowActive]}
                  onPress={() => setSelectedType(item.type)}
                  activeOpacity={0.7}
                >
                  <View style={styles.iconBox}>
                    <Icon size={17} strokeWidth={1.5} color={isSelected ? '#F5F5F5' : '#9CA3AF'} />
                  </View>
                  <View style={styles.optionDetails}>
                    <Text style={[styles.optionLabel, isSelected && styles.optionLabelActive]}>
                      {item.label}
                    </Text>
                    <Text style={styles.optionSub}>{item.sub}</Text>
                  </View>
                  <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                    {isSelected && <Check size={12} strokeWidth={2.5} color="#000000" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Specific Buildings Multi-Chips */}
          {selectedType === 'Specific Buildings' && (
            <View style={styles.buildingsContainer}>
              <Text style={styles.buildingsLabel}>Select Wings</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                {BUILDINGS.map((b) => {
                  const active = selectedBuildings.includes(b);
                  return (
                    <TouchableOpacity
                      key={b}
                      onPress={() => toggleBuilding(b)}
                      style={[styles.chip, active && styles.chipActive]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        Wing {b}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Apply Button */}
          <TouchableOpacity style={styles.applyBtn} onPress={handleApply} activeOpacity={0.85}>
            <Text style={styles.applyBtnText}>Done</Text>
          </TouchableOpacity>
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
    marginTop: 10,
    gap: 4,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  optionRowActive: {
    backgroundColor: '#1A1A1A',
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionDetails: {
    flex: 1,
    gap: 2,
  },
  optionLabel: {
    color: '#D1D5DB',
    fontSize: 14,
    fontWeight: '500',
  },
  optionLabelActive: {
    color: '#F5F5F5',
    fontWeight: '600',
  },
  optionSub: {
    color: '#6B7280',
    fontSize: 11,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleActive: {
    backgroundColor: '#F5F5F5',
    borderColor: '#F5F5F5',
  },
  buildingsContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  buildingsLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  chipsScroll: {
    gap: 8,
    paddingBottom: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  chipActive: {
    backgroundColor: '#F5F5F5',
    borderColor: '#F5F5F5',
  },
  chipText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#000000',
    fontWeight: '600',
  },
  applyBtn: {
    backgroundColor: '#F5F5F5',
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },
  applyBtnText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
  },
});
