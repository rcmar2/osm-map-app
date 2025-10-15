// app/(tabs)/favorites.tsx
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

export default function Favorites() {
  const router = useRouter();                    // ✅ hook inside component
  const insets = useSafeAreaInsets();            // ✅ safe-area for top spacer

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

  // Refresh when the tab gains focus
  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [loadFavorites])
  );

  const removeFavorite = async (station: Station) => {
    try {
      const key = "favorites";
      const stored = await AsyncStorage.getItem(key);
      const list: Station[] = stored ? JSON.parse(stored) : [];
      const filtered = list.filter(
        (f) => !(f.lat === station.lat && f.lon === station.lon)
      );
      await AsyncStorage.setItem(key, JSON.stringify(filtered));
      setFavorites(filtered); // immediate UI refresh
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
        {/* Main press area -> navigate to map & focus marker */}
        <Pressable
          style={{ flex: 1 }}
          onPress={() => {
            router.replace("/"); // go to Home/Map tab
            setTimeout(() => (global as any).focusOnStation?.(item), 50); // let WebView mount
          }}
        >
          <Text style={styles.name}>{item.name || "Unnamed"}</Text>
          <Text style={styles.address}>{addr || "Unknown address"}</Text>
          <Text style={styles.meta}>
            {item.operator || "N/A"} · {(item.power ?? "?")} kW · {item.hdv || "-"}
          </Text>
        </Pressable>

        {/* 3-dots action button */}
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
    <View style={styles.screen}>
      {/* Dark status bar + dark grey top spacer */}
      <StatusBar backgroundColor="#111827" barStyle="light-content" />
      <View style={[styles.topSpacer, { height: insets.top + 8 }]} />

      {/* Content */}
      <View style={styles.container}>
        <FlatList
          data={favorites}
          keyExtractor={(item, i) => `${item.lat}-${item.lon}-${i}`}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={<Text style={styles.empty}>No favorites yet.</Text>}
        />
      </View>

      {/* Actions modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
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
  screen: { flex: 1, backgroundColor: "#0b1220" },
  topSpacer: { backgroundColor: "#111827" }, // dark grey bar under system icons
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

  separator: { height: 1, backgroundColor: "#1e293b", marginHorizontal: 16 },
  empty: { color: "#64748b", textAlign: "center", marginTop: 32 },

  menuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  menuCard: { backgroundColor: "#1e293b", width: "70%", borderRadius: 12, padding: 16 },
  menuTitle: { color: "#fff", fontWeight: "700", fontSize: 16, marginBottom: 8 },
  menuItem: { flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 8 },
  menuText: { color: "#fff", fontSize: 14 },
});
