import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Animated,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";

export default function App() {
  /* ----- mock data (same structure as your HTML) ----- */
  const DATA = [
    { p: 0.18, f: [{ k: "hrv", i: 0.38, d: "down" }, { k: "stress", i: 0.22, d: "up" }, { k: "work", i: 0.17, d: "up" }] },
    { p: 0.46, f: [{ k: "work", i: 0.32, d: "up" }, { k: "stress", i: 0.29, d: "up" }, { k: "hrv", i: 0.19, d: "down" }] },
    { p: 0.76, f: [{ k: "stress", i: 0.44, d: "up" }, { k: "work", i: 0.19, d: "up" }, { k: "hrv", i: 0.16, d: "down" }] },
  ];

  const ACTIONS = {
    "stress:up": ["2-min box breathing", "Stand + stretch", "Silence phone 10 min"],
    "work:up": ["Reschedule one task", "Drink water", "Micro-break 2 min"],
    "hrv:down": ["Good recovery — maintain pace", "Avoid workload spikes"],
  };

  // times for history (mimics your JS dates)
  const now = Date.now();
  const dDays = (n) => new Date(now - n * 864e5).toISOString();
  const hHours = (n) => new Date(now - n * 36e5).toISOString();
  const MIGRAINES = [hHours(3), hHours(22), dDays(2), dDays(5), dDays(9), dDays(15), dDays(21), dDays(27), dDays(29)];

  /* ----- states ----- */
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const toastAnim = useRef(new Animated.Value(0)).current;

  const current = DATA[idx % DATA.length];
  const pct = Math.round(current.p * 100);
  const ringColor = current.p >= 0.7 ? "#f87171" : current.p >= 0.3 ? "#fbbf24" : "#34d399";
  const label = current.p >= 0.7 ? "High" : current.p >= 0.3 ? "Elevated" : "Low";

  /* ----- gauge animation using Animated for smooth transitions ----- */
  const gaugeAnim = useRef(new Animated.Value(pct)).current;
  useEffect(() => {
    // animate gauge value (from previous to new)
    Animated.timing(gaugeAnim, { toValue: pct, duration: 600, useNativeDriver: false }).start();
  }, [pct]);

  const handleRefresh = () => {
    setLoading(true);
    setSelected(null);
    setTimeout(() => {
      setIdx((i) => i + 1);
      setLoading(false);
    }, 700);
  };

  const showToast = () => {
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(900),
      Animated.timing(toastAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  };

  /* ----- helpers for chips/actions/history ----- */
  const name = (k) => ({ stress: "Stress", work: "Workload", hrv: "HRV" }[k] || k);

  const renderChips = () => {
    return current.f.map((f, i) => {
      const key = `${f.k}:${f.d}`;
      const imp = Math.round(f.i * 100);
      const tone = f.i > 0.35 ? "#f87171" : f.i > 0.2 ? "#fbbf24" : "#34d399";
      const emoji = f.k === "hrv" ? "💓" : f.k === "stress" ? "😮‍💨" : "📅";
      const arrow = f.d === "up" ? "↑" : "↓";
      const active = selected === key;
      return (
        <TouchableOpacity
          key={i}
          onPress={() => setSelected(selected === key ? null : key)}
          style={[
            styles.chip,
            { borderColor: active ? "#67e8f9" : "#2a2a2a", backgroundColor: active ? "rgba(103,232,249,0.09)" : "#111" },
          ]}
        >
          <Text style={styles.chipText}>
            {emoji} <Text style={{ fontWeight: "600" }}>{name(f.k)}</Text>{" "}
            <Text style={{ color: tone }}>{arrow} {imp}%</Text>
          </Text>
        </TouchableOpacity>
      );
    });
  };

  const renderActions = () => {
    const acts = ACTIONS[selected] || [];
    if (!acts.length) {
      return <Text style={{ color: "#888", fontSize: 13 }}>Select a driver to see actions</Text>;
    }
    return acts.map((a, i) => (
      <TouchableOpacity key={i} style={styles.actionPill} onPress={showToast}>
        <Text style={styles.actionText}>{a}</Text>
      </TouchableOpacity>
    ));
  };

  const renderHistory = () => {
    const ts = MIGRAINES.map((x) => new Date(x).getTime()).sort((a, b) => b - a);
    const day = 864e5;
    const within = (ms) => ts.filter((t) => now - t <= ms).length;
    const recent = ts.slice(0, 5);

    return (
      <>
        <View style={styles.historySummary}>
          <View style={styles.historyBox}>
            <Text style={styles.historyLabel}>24h</Text>
            <Text style={styles.historyValue}>{within(day)}</Text>
          </View>
          <View style={styles.historyBox}>
            <Text style={styles.historyLabel}>7d</Text>
            <Text style={styles.historyValue}>{within(7 * day)}</Text>
          </View>
          <View style={styles.historyBox}>
            <Text style={styles.historyLabel}>30d</Text>
            <Text style={styles.historyValue}>{within(30 * day)}</Text>
          </View>
        </View>

        <Text style={styles.recentTitle}>Recent events</Text>
        {recent.length ? (
          recent.map((t, i) => {
            const dt = new Date(t);
            const time = dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            return (
              <Text key={i} style={styles.historyItem}>
                {dt.toLocaleDateString()} · {time}
              </Text>
            );
          })
        ) : (
          <Text style={{ color: "#777" }}>No events yet</Text>
        )}
      </>
    );
  };

  /* ----- constants for SVG gauge ----- */
  const size = 180; // px
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Animated strokeDashoffset that updates when gaugeAnim changes
  const animatedOffset = gaugeAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
    extrapolate: "clamp",
  });

  /* ----- UI ----- */
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
      {/* header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <LinearGradient colors={["#22d3ee", "#8b5cf6"]} style={styles.logo}>
            <Text style={styles.logoText}>μ</Text>
          </LinearGradient>
          <View>
            <Text style={styles.title}>Today Migraine Risk</Text>
            <Text style={styles.updated}>Updated —</Text>
          </View>
        </View>

        <TouchableOpacity onPress={handleRefresh} style={styles.refreshBtn}>
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* gauge */}
      <View style={styles.gaugeCard}>
        {loading ? (
          <ActivityIndicator size="large" color={ringColor} />
        ) : (
          <View style={styles.gaugeWrapper}>
            <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
              {/* background track */}
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth={strokeWidth}
                fill="none"
              />
              {/* animated progress circle */}
              <AnimatedCircle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={ringColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={animatedOffset}
              />
            </Svg>

            <View style={styles.gaugeInner}>
              <Animated.Text style={[styles.gaugePct]}>
                {/* display animated number (approx) */}
                {Math.round(gaugeAnim.__getValue ? gaugeAnim.__getValue() : pct)}%
              </Animated.Text>
              <Text style={styles.gaugeBand}>{label} risk next hour</Text>
            </View>
          </View>
        )}
      </View>

      {/* top drivers */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top drivers</Text>
        <View style={styles.chipContainer}>{renderChips()}</View>
      </View>

      {/* recommended actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recommended actions</Text>
        <View style={styles.actionsContainer}>{renderActions()}</View>
      </View>

      {/* history */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>History (Migraine Occurrence)</Text>
        {renderHistory()}
      </View>

      {/* toast */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.toast,
          {
            opacity: toastAnim,
            transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
          },
        ]}
      >
        <Text style={styles.toastText}>Action logged</Text>
      </Animated.View>
    </ScrollView>
  );
}

/* AnimatedCircle helper */
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/* ----- styles ----- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#080808" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16 },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  logo: { width: 42, height: 42, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  logoText: { fontWeight: "700", color: "#000" },
  title: { fontWeight: "600", color: "#fff", fontSize: 16 },
  updated: { color: "#9ca3af", fontSize: 12 },
  refreshBtn: { backgroundColor: "#0f0f0f", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: "#232323" },
  refreshText: { color: "#fff", fontSize: 13 },

  gaugeCard: { marginHorizontal: 16, marginTop: 6, marginBottom: 18, alignItems: "center" },
  gaugeWrapper: { width: 200, height: 200, alignItems: "center", justifyContent: "center" },
  gaugeInner: { position: "absolute", alignItems: "center", justifyContent: "center" },
  gaugePct: { fontSize: 36, fontWeight: "800", color: "#fff" },
  gaugeBand: { color: "#9ca3af", fontSize: 13, marginTop: 6 },

  section: { paddingHorizontal: 16, marginBottom: 18 },
  sectionTitle: { color: "#9ca3af", fontSize: 12, marginBottom: 8, textTransform: "uppercase" },

  chipContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, marginRight: 8, marginBottom: 8 },
  chipText: { color: "#fff", fontSize: 14 },

  actionsContainer: { marginTop: 8 },
  actionPill: { backgroundColor: "#0f0f0f", borderRadius: 12, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: "#202020" },
  actionText: { color: "#e6e6e6" },

  historySummary: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  historyBox: { flex: 1, backgroundColor: "#0f0f0f", marginHorizontal: 4, padding: 10, borderRadius: 10, alignItems: "center", borderWidth: 1, borderColor: "#222" },
  historyLabel: { color: "#9ca3af", fontSize: 12 },
  historyValue: { color: "#fff", fontWeight: "700", marginTop: 6 },
  recentTitle: { color: "#9ca3af", marginTop: 12, marginBottom: 8, fontSize: 12 },
  historyItem: { color: "#ccc", marginBottom: 6 },

  toast: { position: "absolute", left: 0, right: 0, bottom: 28, alignItems: "center" },
  toastText: { backgroundColor: "#0b0b0b", color: "#fff", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: "#222" },
});
