// app/(tabs)/favorites.tsx
import React, { useMemo } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import stationsData from "../../assets/stations.json";

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
  // Initially show only Milence chargers
  const favorites = useMemo(() => {
    return (stationsData as Station[]).filter(
      (s) => (s.operator || "").toLowerCase() === "milence"
    );
  }, []);

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
        ListEmptyComponent={<Text style={styles.empty}>No Milence chargers found.</Text>}
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
