// app/(tabs)/favorites.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native"; // refresh on focus
import React, { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

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
  const [favorites, setFavorites] = useState<Station[]>([]);

  // Load favorites from persistent storage
  const loadFavorites = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem("favorites");
      setFavorites(stored ? JSON.parse(stored) : []);
    } catch (e) {
      console.log("Error loading favorites:", e);
    }
  }, []);

  // Reload every time the tab comes into focus
  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [loadFavorites])
  );

  const renderItem = ({ item }: { item: Station }) => {
    const addr = [item.street, item.city, item.country].filter(Boolean).join(", ");
    return (
      <View style={styles.row}>
        <Text style={styles.name}>{item.name || "Unnamed"}</Text>
        <Text style={styles.address}>{addr || "Unknown address"}</Text>
        <Text style={styles.meta}>
          {item.operator || "N/A"} · {(item.power ?? "?")} kW · {item.hdv || "-"}
        </Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b1220", paddingVertical: 8 },
  row: { paddingHorizontal: 16, paddingVertical: 10 },
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
});
