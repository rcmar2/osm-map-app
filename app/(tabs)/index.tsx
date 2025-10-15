// app/(tabs)/Index.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { WebView } from "react-native-webview";
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

export default function Index() {
  const SYGIC_KEY =
    process.env.EXPO_PUBLIC_SYGIC_KEY ||
    "12e40664a6fadbeca9257eaf163be047befdb1c87f83a9a7b84960ebcaf299c6";

  const webRef = useRef<WebView>(null);

  // Expose a static method for other tabs to focus on a station
  (global as any).focusOnStation = (station: { lat: number; lon: number }) => {
    webRef.current?.postMessage(
      JSON.stringify({
        type: "focusStation",
        lat: station.lat,
        lon: station.lon,
      })
    );
  };

  const [webReady, setWebReady] = useState(false);

  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [minPower, setMinPower] = useState<string>("50");
  const [stations, setStations] = useState<Station[]>(stationsData as Station[]);

  const [clusteringEnabled, setClusteringEnabled] = useState(true);
  const [autoRouting, setAutoRouting] = useState(false);

  // Load HTML from assets
  useEffect(() => {
    (async () => {
      const asset = Asset.fromModule(require("../../assets/map.html"));
      await asset.downloadAsync();
      const local = asset.localUri ?? asset.uri;
      const content = await FileSystem.readAsStringAsync(local);
      setHtmlContent(content);
    })();
  }, []);

  // Optionally load external stations.json if user placed one
  useEffect(() => {
    (async () => {
      try {
        const baseDir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
        if (!baseDir) return;
        const fileUri = baseDir + "stations.json";
        const info = await FileSystem.getInfoAsync(fileUri);
        if (info.exists) {
          const content = await FileSystem.readAsStringAsync(fileUri);
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) setStations(parsed as Station[]);
        }
      } catch (e) {
        console.log("Could not load side stations.json, using bundled default.", e);
      }
    })();
  }, []);

  const sendInit = useCallback(() => {
    webRef.current?.postMessage(JSON.stringify({ type: "init", sygicKey: SYGIC_KEY }));
  }, [SYGIC_KEY]);

  const sendStations = useCallback(() => {
    webRef.current?.postMessage(JSON.stringify({ type: "setStations", data: stations }));
  }, [stations]);

  const sendClusteringToggle = useCallback((enabled: boolean) => {
    webRef.current?.postMessage(JSON.stringify({ type: "toggleClustering", enabled }));
  }, []);

  useEffect(() => {
    if (webReady) {
      sendInit();
      sendStations();
    }
  }, [webReady, sendInit, sendStations]);

  function applyFilter() {
    const value = Number(minPower) || 0;
    webRef.current?.postMessage(JSON.stringify({ type: "applyFilter", minKw: value }));
    setShowFilter(false);
  }

  function toggleClustering(value: boolean) {
    setClusteringEnabled(value);
    sendClusteringToggle(value);
  }

  return (
    <View style={styles.container}>
      {htmlContent ? (
        <WebView
          onMessage={async (e) => {
            try {
              const msg = JSON.parse(e.nativeEvent.data);
              if (msg.type === "addFavorite" && msg.station) {
                const key = "favorites";
                const stored = await AsyncStorage.getItem(key);
                const favorites = stored ? JSON.parse(stored) : [];
                // avoid duplicates by lat/lon
                const exists = favorites.some(
                  (f: any) => f.lat === msg.station.lat && f.lon === msg.station.lon
                );
                if (!exists) {
                  favorites.push(msg.station);
                  await AsyncStorage.setItem(key, JSON.stringify(favorites));
                  console.log("Added favorite:", msg.station.name);
                }
              } else if (msg.type === "navigateTo") {
                console.log("Navigation placeholder:", msg.station);
              }
            } catch (err) {
              console.warn("Message parse error", err);
            }
          }}
          ref={webRef}
          originWhitelist={["*"]}
          javaScriptEnabled
          domStorageEnabled
          setSupportMultipleWindows={false}
          onLoadEnd={() => setWebReady(true)}
          source={{ html: htmlContent, baseUrl: "https://local" }}
        />
      ) : (
        <View style={{ flex: 1, backgroundColor: "#000" }} />
      )}

      {/* Floating buttons */}
      <Pressable style={styles.fabFilter} onPress={() => setShowFilter(true)}>
        <Text style={styles.fabText}>Filter</Text>
      </Pressable>

      <Pressable style={styles.fabSettings} onPress={() => setShowSettings(true)}>
        <Text style={styles.fabText}>⚙️</Text>
      </Pressable>

      {/* Filter modal */}
      <Modal visible={showFilter} transparent animationType="slide" onRequestClose={() => setShowFilter(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.title}>Filter chargers</Text>
            <Text style={styles.label}>Min connector power (kW)</Text>
            <TextInput
              value={minPower}
              onChangeText={setMinPower}
              keyboardType="numeric"
              style={styles.input}
            />
            <View style={styles.row}>
              <Pressable onPress={() => setShowFilter(false)} style={[styles.btn, styles.btnSecondary]}>
                <Text style={styles.btnText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={applyFilter} style={[styles.btn, styles.btnPrimary]}>
                <Text style={styles.btnText}>Apply</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Settings modal */}
      <Modal visible={showSettings} transparent animationType="slide" onRequestClose={() => setShowSettings(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.title}>Settings</Text>
            <View style={styles.settingRow}>
              <Text style={styles.label}>Clustering</Text>
              <Switch value={clusteringEnabled} onValueChange={toggleClustering} />
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.label}>Automatic routing</Text>
              <Switch value={autoRouting} onValueChange={setAutoRouting} />
            </View>
            <View style={styles.row}>
              <Pressable onPress={() => setShowSettings(false)} style={[styles.btn, styles.btnPrimary]}>
                <Text style={styles.btnText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  fabFilter: {
    position: "absolute", right: 16, bottom: 24,
    backgroundColor: "#1f2937", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 999,
  },
  fabSettings: {
    position: "absolute", right: 16, top: 32,
    backgroundColor: "#1f2937", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999,
  },
  fabText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  modalBackdrop: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "flex-end"
  },
  modalCard: {
    width: "100%", backgroundColor: "#111827", padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    marginBottom: 160,
  },
  title: { color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 12 },
  label: { color: "#cbd5e1", marginBottom: 6 },
  input: {
    backgroundColor: "#0b1220", borderColor: "#334155", borderWidth: 1, color: "#fff",
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, marginBottom: 12
  },
  settingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  row: { flexDirection: "row", justifyContent: "flex-end", gap: 12 },
  btn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  btnSecondary: { backgroundColor: "#374151" },
  btnPrimary: { backgroundColor: "#16a34a" },
  btnText: { color: "#fff", fontWeight: "600" },
});
