import * as FileSystem from "expo-file-system";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { WebView } from "react-native-webview";
import stationsData from "../../assets/stations.json"; // default dataset bundled with the app

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
  const [showFilter, setShowFilter] = useState(false);
  const [minPower, setMinPower] = useState<string>("50"); // kW
  const [stations, setStations] = useState<Station[]>(stationsData as Station[]);

  // --- Load side-file if present (fixes TS null warning by guarding the dir) ---
  useEffect(() => {
    (async () => {
      try {
        const baseDir =
          FileSystem.documentDirectory ?? FileSystem.cacheDirectory; // ✅ handle null
        if (!baseDir) return; // very rare on native; just skip if still null

        const fileUri = baseDir + "stations.json";
        const info = await FileSystem.getInfoAsync(fileUri);
        if (info.exists) {
          const content = await FileSystem.readAsStringAsync(fileUri);
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            setStations(parsed as Station[]);
          } else {
            console.log("stations.json is not an array; using bundled default.");
          }
        }
      } catch (e) {
        console.log("Could not load side stations.json, using default.", e);
      }
    })();
  }, []);

  const html = useMemo(
    () => `
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <style>
    html, body, #map { height: 100%; margin: 0; }
    .badge { position:absolute; bottom:6px; left:8px; padding:2px 6px; border-radius:4px;
      background:rgba(0,0,0,0.5); color:#fff; font-size:11px; z-index:1000; }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="badge">© OpenStreetMap contributors | © Sygic</div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://maps.api.sygic.com/js/leaflet.sygic-1.1.0.js"></script>

  <script>
    var map = L.map('map');
    L.TileLayer.sygic('${SYGIC_KEY}', { poi: true }).addTo(map);

    // Fit a wide Central Europe view
    var sw = L.latLng(45.0, 5.0);
    var ne = L.latLng(55.5, 20.0);
    map.fitBounds(L.latLngBounds(sw, ne));

    let stations = [];

    function renderStations(data){
      // remove existing
      stations.forEach(s => map.removeLayer(s.layer));
      stations = data.map((s) => {
        const hdv = (s.hdv || "").toUpperCase();
        const heavy = hdv.includes("N2") || hdv.includes("N3");
        const color = heavy ? "#ff7b00" : "#007bff"; // orange vs blue

        const addr = [s.street || "", s.city || "", s.country || ""].filter(Boolean).join(" ");
        const popup = \`
          <b>\${s.name || "Unnamed"}</b><br/>
          \${addr}<br/>
          Operator: \${s.operator || "N/A"}<br/>
          Power: \${(s.power ?? "?")} kW
        \`;

        const layer = L.circleMarker([s.lat, s.lon], {
          radius: 7,
          weight: 2,
          color: color,
          fillColor: color,
          fillOpacity: 0.85
        }).bindPopup(popup);

        layer.addTo(map);
        return { ...s, layer };
      });
    }

    function applyFilter(minKw){
      stations.forEach(s => {
        const onMap = map.hasLayer(s.layer);
        const show = (Number(s.power) || 0) >= minKw;
        if (show && !onMap) s.layer.addTo(map);
        if (!show && onMap) map.removeLayer(s.layer);
      });
    }

    // Message bridge
    function handleMsg(e){
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "setStations") renderStations(msg.data || []);
        if (msg.type === "applyFilter") applyFilter(Number(msg.minKw) || 0);
      } catch(err) { console.error(err); }
    }
    document.addEventListener("message", handleMsg);
    window.addEventListener("message", handleMsg);
  </script>
</body>
</html>
`,
    [SYGIC_KEY]
  );

  // --- Post stations when WebView is ready, and when stations change ---
  const sendStations = useCallback(() => {
    if (webReady && webRef.current) {
      webRef.current.postMessage(JSON.stringify({ type: "setStations", data: stations }));
    }
  }, [webReady, stations]);

  useEffect(() => {
    sendStations();
  }, [sendStations]);

  function applyFilter() {
    const value = Number(minPower) || 0;
    webRef.current?.postMessage(JSON.stringify({ type: "applyFilter", minKw: value }));
    setShowFilter(false);
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webRef}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        onLoadEnd={() => setWebReady(true)}  // ✅ ensures page is ready
        source={{ html }}
      />

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
  fab: { position: "absolute", right: 16, bottom: 24, backgroundColor: "#1f2937", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 999 },
  fabText: { color: "#fff", fontWeight: "600" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "flex-end" },
  modalCard: { width: "100%", backgroundColor: "#111827", padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  title: { color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 12 },
  label: { color: "#cbd5e1", marginBottom: 6 },
  input: { backgroundColor: "#0b1220", borderColor: "#334155", borderWidth: 1, color: "#fff", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, marginBottom: 12 },
  row: { flexDirection: "row", justifyContent: "flex-end", gap: 12 },
  btn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  btnSecondary: { backgroundColor: "#374151" },
  btnPrimary: { backgroundColor: "#16a34a" },
  btnText: { color: "#fff", fontWeight: "600" },
});
