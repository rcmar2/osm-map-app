// app/(tabs)/Index.tsx
import React, { useMemo, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { WebView } from "react-native-webview";

export default function Index() {
  const SYGIC_KEY = process.env.EXPO_PUBLIC_SYGIC_KEY || "12e40664a6fadbeca9257eaf163be047befdb1c87f83a9a7b84960ebcaf299c6";
  const webRef = useRef<WebView>(null);

  const [showFilter, setShowFilter] = useState(false);
  const [minPower, setMinPower] = useState<string>("50"); // kW

  const html = useMemo(() => `
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
    .filterBtn { position:absolute; top:10px; right:10px; z-index:1001;
      background:rgba(0,0,0,0.6); color:#fff; padding:8px 10px; border-radius:6px; font-family:sans-serif; }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="badge">© OpenStreetMap contributors | © Sygic</div>
  <div class="filterBtn">Filter in RN ↑</div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://unpkg.com/@mapbox/polyline@1.1.1/src/polyline.js"></script>
  <script src="https://maps.api.sygic.com/js/leaflet.sygic-1.1.0.js"></script>

  <script>
    var map = L.map('map');
    L.TileLayer.sygic('${SYGIC_KEY}', { poi: true }).addTo(map);

    // Germany bounds (approx)
    var deSW = L.latLng(47.270111, 5.866342);
    var deNE = L.latLng(55.058347, 15.041896);
    var deBounds = L.latLngBounds(deSW, deNE);
    map.fitBounds(deBounds);

    // Seeded RNG for deterministic markers
    let seed = 1337;
    function rand(){ seed = (seed * 1664525 + 1013904223) % 4294967296; return seed/4294967296; }
    function r(min,max){ return min + rand()*(max-min); }

    // Create 10 stations with power meta + marker layer
    const kWOptions = [22, 50, 75, 150, 300];
    const stations = [];
    for (let i=0;i<10;i++){
      const lat = r(47.3,54.9), lng = r(6.0,14.9);
      const power = kWOptions[Math.floor(rand()*kWOptions.length)];
      const layer = L.circleMarker([lat,lng], {
        radius: 7, weight:2, opacity:1, color:'#0f5132', fillColor:'#198754', fillOpacity:0.85
      }).bindPopup('<b>EV Charger #'+(i+1)+'</b><br/>Power: '+power+' kW');

      stations.push({ lat, lng, power, layer });
      layer.addTo(map);
    }

    // Expose a filter function for RN to call
    window.applyFilter = function(minKw){
      stations.forEach(s=>{
        const onMap = map.hasLayer(s.layer);
        const shouldShow = s.power >= minKw;
        if (shouldShow && !onMap) s.layer.addTo(map);
        if (!shouldShow && onMap) map.removeLayer(s.layer);
      });
    };
  </script>
</body>
</html>
`, []);

  function applyFilter() {
    const value = Number(minPower) || 0;
    // Call the function exposed by the WebView page
    webRef.current?.injectJavaScript(`window.applyFilter && window.applyFilter(${value}); true;`);
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
        source={{ html }}
      />

      {/* Simple floating button to open filter */}
      <Pressable style={styles.fab} onPress={() => setShowFilter(true)}>
        <Text style={styles.fabText}>Filter</Text>
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
              placeholder="e.g. 100"
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
    flex:1, backgroundColor:"rgba(0,0,0,0.5)", alignItems:"center", justifyContent:"flex-end"
  },
  modalCard: {
    width:"100%", backgroundColor:"#111827", padding:16, borderTopLeftRadius:16, borderTopRightRadius:16
  },
  title: { color:"#fff", fontSize:18, fontWeight:"700", marginBottom:12 },
  label: { color:"#cbd5e1", marginBottom:6 },
  input: {
    backgroundColor:"#0b1220", borderColor:"#334155", borderWidth:1, color:"#fff",
    paddingHorizontal:12, paddingVertical:10, borderRadius:8, marginBottom:12
  },
  row: { flexDirection:"row", justifyContent:"flex-end", gap:12 },
  btn: { paddingHorizontal:14, paddingVertical:10, borderRadius:8 },
  btnSecondary: { backgroundColor:"#374151" },
  btnPrimary: { backgroundColor:"#16a34a" },
  btnText: { color:"#fff", fontWeight:"600" }
});
