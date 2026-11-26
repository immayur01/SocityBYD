import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { X, Folder, Check } from 'lucide-react-native';

export interface AlbumItem {
  id: string;
  title: string;
  assetCount?: number;
}

interface AlbumSheetProps {
  visible: boolean;
  albums: AlbumItem[];
  selectedAlbumId: string;
  onSelectAlbum: (album: AlbumItem) => void;
  onClose: () => void;
}

export const AlbumSheet: React.FC<AlbumSheetProps> = ({
  visible,
  albums,
  selectedAlbumId,
  onSelectAlbum,
  onClose,
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.sheetContainer} activeOpacity={1} onPress={() => {}}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>Select Album</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={18} strokeWidth={1.5} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {albums.map((album) => {
              const isSelected = selectedAlbumId === album.id;
              return (
                <TouchableOpacity
                  key={album.id}
                  style={[styles.albumRow, isSelected && styles.albumRowActive]}
                  onPress={() => {
                    onSelectAlbum(album);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.albumIconBox}>
                    <Folder size={18} strokeWidth={1.5} color={isSelected ? '#F5F5F5' : '#9CA3AF'} />
                  </View>
                  <View style={styles.albumDetails}>
                    <Text style={[styles.albumTitle, isSelected && styles.albumTitleActive]}>
                      {album.title}
                    </Text>
                    {album.assetCount !== undefined && (
                      <Text style={styles.albumCount}>{album.assetCount} items</Text>
                    )}
                  </View>
                  {isSelected && <Check size={16} strokeWidth={2.5} color="#F5F5F5" />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
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
    maxHeight: '60%',
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
  list: {
    marginTop: 8,
  },
  albumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  albumRowActive: {
    backgroundColor: '#1A1A1A',
  },
  albumIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  albumDetails: {
    flex: 1,
    gap: 2,
  },
  albumTitle: {
    color: '#D1D5DB',
    fontSize: 14,
    fontWeight: '500',
  },
  albumTitleActive: {
    color: '#F5F5F5',
    fontWeight: '600',
  },
  albumCount: {
    color: '#6B7280',
    fontSize: 11,
  },
});
