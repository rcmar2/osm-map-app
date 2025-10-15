// app/(tabs)/favorites.tsx
import { Ionicons } from "@expo/vector-icons"; // ✅ icon for 3 dots
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";


type Station = {
  lat: number;
  lon: number;
  name: string;
  street?: string;
  city?: string;
  country?: string;
  operator?: string;
  power?: number;
  hdv?: string;
};

const router = useRouter();

export default function Favorites() {
  const [favorites, setFavorites] = useState<Station[]>([]);
  const [selected, setSelected] = useState<Station | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  const loadFavorites = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem("favorites");
      setFavorites(stored ? JSON.parse(stored) : []);
    } catch (e) {
      console.log("Error loading favorites:", e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [loadFavorites])
  );

  const removeFavorite = async (station: Station) => {
    try {
      const key = "favorites";
      const stored = await AsyncStorage.getItem(key);
      const favorites = stored ? JSON.parse(stored) : [];
      const filtered = favorites.filter(
        (f: Station) => !(f.lat === station.lat && f.lon === station.lon)
      );
      await AsyncStorage.setItem(key, JSON.stringify(filtered));
      setFavorites(filtered); // ✅ immediate refresh
      setShowMenu(false);
      setSelected(null);
    } catch (err) {
      console.error("Error removing favorite:", err);
    }
  };

  const renderItem = ({ item }: { item: Station }) => {
    const addr = [item.street, item.city, item.country].filter(Boolean).join(", ");
    return (
      <View style={styles.row}>
        <Pressable
          style={{ flex: 1 }}
          onPress={() => {
            // Switch to Home tab
            router.replace("/");
            setTimeout(() => (global as any).focusOnStation?.(item), 50); // tiny delay helps ensure WebView is mounted
          }}
        >
          <Text style={styles.name}>{item.name || "Unnamed"}</Text>
          <Text style={styles.address}>{addr || "Unknown address"}</Text>
          <Text style={styles.meta}>
            {item.operator || "N/A"} · {(item.power ?? "?")} kW · {item.hdv || "-"}
          </Text>
        </Pressable>
        <Pressable
          style={styles.moreBtn}
          onPress={() => {
            setSelected(item);
            setShowMenu(true);
          }}
        >
          <Ionicons name="ellipsis-vertical" size={18} color="#9ca3af" />
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={favorites}
        keyExtractor={(item, i) => `${item.lat}-${item.lon}-${i}`}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={<Text style={styles.empty}>No favorites yet.</Text>}
      />

      {/* Action menu modal */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <View style={styles.menuBackdrop}>
          <View style={styles.menuCard}>
            <Text style={styles.menuTitle}>Actions</Text>
            <Pressable
              style={styles.menuItem}
              onPress={() => selected && removeFavorite(selected)}
            >
              <Ionicons name="trash-outline" size={16} color="#f87171" />
              <Text style={styles.menuText}>Remove</Text>
            </Pressable>

            <Pressable
              style={[styles.menuItem, { justifyContent: "center" }]}
              onPress={() => setShowMenu(false)}
            >
              <Text style={[styles.menuText, { color: "#94a3b8" }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b1220", paddingVertical: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  moreBtn: { padding: 8 },
  name: { color: "#fff", fontWeight: "700", fontSize: 16, marginBottom: 2 },
  address: { color: "#cbd5e1", fontSize: 13, marginBottom: 2 },
  meta: { color: "#94a3b8", fontSize: 12 },
  separator: {
    height: 1,
    backgroundColor: "#1e293b",
    marginHorizontal: 16,
  },
  empty: {
    color: "#64748b",
    textAlign: "center",
    marginTop: 32,
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  menuCard: {
    backgroundColor: "#1e293b",
    width: "70%",
    borderRadius: 12,
    padding: 16,
  },
  menuTitle: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 8,
  },
  menuText: { color: "#fff", fontSize: 14 },
});
