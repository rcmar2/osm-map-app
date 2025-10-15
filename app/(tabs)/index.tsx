// app/(tabs)/Index.tsx
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
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
  const [webReady, setWebReady] = useState(false);
  const [htmlUri, setHtmlUri] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [minPower, setMinPower] = useState<string>("50");
  const [stations, setStations] = useState<Station[]>(stationsData as Station[]);

  // Load the local HTML asset and get a file:// or local uri Expo can serve
  useEffect(() => {
    (async () => {
      const asset = Asset.fromModule(require("../../assets/map.html"));
      await asset.downloadAsync();
      setHtmlUri(asset.localUri ?? asset.uri);
    })();
  }, []);

  // Load optional side-file stations.json from app storage (if present)
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

  // Send init + stations when ready
  const sendInit = useCallback(() => {
    if (webRef.current) {
      webRef.current.postMessage(JSON.stringify({ type: "init", sygicKey: SYGIC_KEY }));
    }
  }, [SYGIC_KEY]);

  const sendStations = useCallback(() => {
    if (webRef.current) {
      webRef.current.postMessage(JSON.stringify({ type: "setStations", data: stations }));
    }
  }, [stations]);

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

  return (
    <View style={styles.container}>
      {htmlUri ? (
        <WebView
          ref={webRef}
          originWhitelist={["*"]}
          javaScriptEnabled
          domStorageEnabled
          setSupportMultipleWindows={false}
          onLoadEnd={() => setWebReady(true)}
          source={{ uri: htmlUri }}
        />
      ) : (
        <View style={{ flex: 1, backgroundColor: "#000" }} />
      )}

      <Pressable style={styles.fab} onPress={() => setShowFilter(true)}>
        <Text style={styles.fabText}>Filter</Text>
      </Pressable>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  fab: {
    position: "absolute", right: 16, bottom: 24,
    backgroundColor: "#1f2937", paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 999
  },
  fabText: { color: "#fff", fontWeight: "600" },
  modalBackdrop: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "flex-end"
  },
  modalCard: {
    width: "100%", backgroundColor: "#111827", padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16
  },
  title: { color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 12 },
  label: { color: "#cbd5e1", marginBottom: 6 },
  input: {
    backgroundColor: "#0b1220", borderColor: "#334155", borderWidth: 1, color: "#fff",
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, marginBottom: 12
  },
  row: { flexDirection: "row", justifyContent: "flex-end", gap: 12 },
  btn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  btnSecondary: { backgroundColor: "#374151" },
  btnPrimary: { backgroundColor: "#16a34a" },
  btnText: { color: "#fff", fontWeight: "600" }
});
