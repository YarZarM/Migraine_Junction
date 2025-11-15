import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  RefreshControl,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import * as Notifications from "expo-notifications";
import { setupNotificationListeners } from "../notifications/onNotification"
import { registerForPushNotifications } from "../notifications/registerPush";

async function registerForPushNotificationsAsync() {
  let token;

  // Ask for permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Failed to get push token for push notification!");
    return;
  }

  // Get the Expo push token
  token = (await Notifications.getExpoPushTokenAsync()).data;
  console.log("Expo push token:", token);

  // (Optional) Android notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  return token;
}


export default function App() {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);      // general loading (incl. initial)
  const [refreshing, setRefreshing] = useState(false); // pull-to-refresh only

  const MIN_LOAD_TIME = 900; // ms
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

  // Fetch API
  const fetchData = async (isRefresh = false) => {
    const start = Date.now();
    try {
      if (isRefresh) setRefreshing(true);
      setLoading(true);

      const res = await fetch("http://172.20.10.3:5000/api/v1/latest");

      const contentType = res.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const json = await res.json();
        setData(json);
      } else {
        const text = await res.text();
        console.warn("Expected JSON but got:", text);
        setData(null);
      }

      setSelected(null);
    } catch (err) {
      console.error("Fetch error:", err);
      setData(null);
    } finally {
      const elapsed = Date.now() - start;
      if (elapsed < MIN_LOAD_TIME) {
        await sleep(MIN_LOAD_TIME - elapsed);
      }
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  };

  useEffect(() => {
    // This will run once when the app mounts
    registerForPushNotifications();
  }, []);

  useEffect(() => {
    setupNotificationListeners();
  }, []);

  useEffect(() => {
    // 1) Get latest migraine data (your existing API)
    fetchData(false);

    // 2) Register for push notifications and send token to backend
    const setupPush = async () => {
      try {
        const token = await registerForPushNotificationsAsync();
        if (!token) return;

        // ⚠️ IMPORTANT: do NOT use "https://localhost" on a real device
        // Replace with your actual server IP / domain, e.g.:
        // http://192.168.1.5:5000 or your ngrok URL
        await fetch("http://172.20.10.3:5000/api/v1/register-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            expoPushToken: token,
            // Add whatever else you need: userId, device info, etc.
          }),
        });
      } catch (err) {
        console.error("Error sending push token to backend:", err);
      }
    };

    setupPush();
  }, []);

  // Derived values
  const pct = Math.round((data?.p_next_hour || 0) * 100);
  const riskLevel =
    pct >= 70 ? "High" :
    pct >= 30 ? "Elevated" :
    "Low";

  const ringColor =
    riskLevel === "High" ? "#f87171" :
    riskLevel === "Elevated" ? "#fbbf24" :
    "#34d399";

  const featureName = (f) => {
    if (f.includes("stress")) return "Stress";
    if (f.includes("workload")) return "Workload";
    if (f.includes("hrv")) return "HRV";
    return f;
  };

  const renderChips = () => {
    if (!data?.top_factors) return null;

    return data.top_factors.map((f, i) => {
      const key = f.feature;
      const imp = Math.round(f.score * 100);
      const tone =
        f.score > 0.35 ? "#f87171" :
        f.score > 0.2 ? "#fbbf24" :
        "#34d399";
      const emoji = f.feature.includes("hrv")
        ? "💓"
        : f.feature.includes("stress")
        ? "😮‍💨"
        : "📅";
      const arrow = f.score >= 0.5 ? "↑" : "↓";
      const active = selected === key;

      return (
        <TouchableOpacity
          key={i}
          onPress={() => setSelected(active ? null : key)}
          style={[
            styles.chip,
            {
              borderColor: active ? "#67e8f9" : "#2a2a2a",
              backgroundColor: active ? "rgba(103,232,249,0.09)" : "#111",
            },
          ]}
        >
          <Text style={styles.chipText}>
            {emoji}{" "}
            <Text style={{ fontWeight: "600" }}>{featureName(f.feature)}</Text>{" "}
            <Text style={{ color: tone }}>{arrow} {imp}%</Text>
          </Text>
        </TouchableOpacity>
      );
    });
  };

  const renderActions = () => {
    if (!data?.recommended_actions) return null;

    const acts = selected ? data.recommended_actions : [];
    if (!acts.length)
      return <Text style={{ color: "#888", fontSize: 13 }}>Select a driver</Text>;

    return acts.map((a, i) => (
      <TouchableOpacity key={i} style={styles.actionPill}>
        <Text style={styles.actionText}>{a}</Text>
      </TouchableOpacity>
    ));
  };

  // Gauge sizing
  const size = 180;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 60, paddingTop: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchData(true)}
            tintColor="#fff"
          />
        }
      >
        {/* Normal content (hidden visually when refreshing via overlay) */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <LinearGradient colors={["#22d3ee", "#8b5cf6"]} style={styles.logo}>
              <Ionicons name="menu" size={26} color="#000" />
            </LinearGradient>
            <View>
              <Text style={styles.title}>Today Migraine Risk</Text>
              <Text style={styles.updated}>Updated Migraine Info</Text>
            </View>
          </View>
        </View>

        {/* GAUGE */}
        <View style={styles.gaugeCard}>
          {loading ? (
            <ActivityIndicator size="large" color={ringColor} />
          ) : (
            <View style={styles.gaugeWrapper}>
              <Svg
                width={size}
                height={size}
                style={{ transform: [{ rotate: "-90deg" }] }}
              >
                <Circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke="#111"
                  strokeWidth={strokeWidth}
                  fill="none"
                />
                <Circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={ringColor}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  fill="none"
                />
              </Svg>
              <View style={styles.gaugeInner}>
                <Text style={styles.gaugePct}>{pct}%</Text>
                <Text style={styles.gaugeBand}>{riskLevel} risk next hour</Text>
              </View>
            </View>
          )}
        </View>

        {/* TOP DRIVERS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top drivers</Text>
          <View style={styles.chipContainer}>{renderChips()}</View>
        </View>

        {/* ACTIONS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommended actions</Text>
          <View style={styles.actionsContainer}>{renderActions()}</View>
        </View>
      </ScrollView>

      {/* 🔥 FULL-SCREEN OVERLAY WHEN REFRESHING */}
      {refreshing && (
        <View style={styles.refreshOverlay}>
          <ActivityIndicator size="large" color="#22d3ee" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#080808",
  },
  container: {
    flex: 1,
  },

  refreshOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#080808", // same as background to hide content
    zIndex: 10,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingTop: 50,
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  logo: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  title: { fontWeight: "600", color: "#fff", fontSize: 16, paddingLeft: 20 },
  updated: { color: "#9ca3af", fontSize: 12, paddingLeft: 20 },

  gaugeCard: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 18,
    alignItems: "center",
  },
  gaugeWrapper: {
    width: 200,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  gaugeInner: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  gaugePct: {
    fontSize: 36,
    fontWeight: "800",
    color: "#fff",
  },
  gaugeBand: {
    color: "#9ca3af",
    fontSize: 13,
    marginTop: 6,
  },

  section: { paddingHorizontal: 16, marginBottom: 18 },
  sectionTitle: {
    color: "#9ca3af",
    fontSize: 12,
    marginBottom: 8,
    textTransform: "uppercase",
  },

  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: { color: "#fff", fontSize: 14 },

  actionsContainer: { marginTop: 8 },
  actionPill: {
    backgroundColor: "#0f0f0f",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#202020",
  },
  actionText: { color: "#e6e6e6" },
});
