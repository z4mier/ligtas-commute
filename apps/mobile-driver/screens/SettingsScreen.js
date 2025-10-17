import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Modal,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Switch,
  Animated,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { API_URL } from "../constants/config";

const C = {
  brand: "#0E4371",       
  text: "#111827",
  textSub: "#6B7280",
  white: "#FFFFFF",
  card: "#FFFFFF",
  page: "#F3F4F6",
  border: "#E5E7EB",
  chipBg: "#F3F4F6",
  chipActive: "#0F172A",
  yellow: "#F59E0B",
  success: "#22C55E",
  danger: "#EF4444",
};

function useToast() {
  const [msg, setMsg] = useState("");
  const [tone, setTone] = useState("success");
  const y = useRef(new Animated.Value(-60)).current;

  const show = useCallback((text, t = "success") => {
    setTone(t);
    setMsg(text);
    Animated.sequence([
      Animated.timing(y, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.delay(1600),
      Animated.timing(y, { toValue: -60, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [y]);

  const Toast = (
    <Animated.View
      pointerEvents="none"
      style={[
        s.toast,
        {
          transform: [{ translateY: y }],
          backgroundColor: tone === "success" ? C.success : C.danger,
        },
      ]}
    >
      <Text style={[s.f600, { color: C.white }]}>{msg}</Text>
    </Animated.View>
  );
  return { show, Toast };
}

export default function SettingsScreen({ navigation }) {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const { show, Toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [dark, setDark] = useState(false);
  const [profile, setProfile] = useState(null);
  const [points, setPoints] = useState(0);
  const [language, setLanguage] = useState("en"); 

  // Modals
  const [profileModal, setProfileModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [accountModal, setAccountModal] = useState(false);
  const [logoutModal, setLogoutModal] = useState(false);
  const [termsModal, setTermsModal] = useState(false);
  const [supportModal, setSupportModal] = useState(false);
  const [tab, setTab] = useState("username");

  // Edit form
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  // Account form
  const [newUsername, setNewUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const original = useMemo(
    () => ({ fullName, email, phone, address }),
    // lock after fetch completes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loading]
  );

  const fetchMe = useCallback(async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token) {
      navigation.replace("Login");
      return;
    }
    const res = await fetch(`${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      await AsyncStorage.removeItem("token");
      navigation.replace("Login");
      return;
    }
    const data = await res.json();
    setProfile(data);
    setPoints(Number(data?.points || 0));
    setFullName(data?.fullName || "");
    setEmail(data?.email || "");
    setPhone(data?.phone || "");
    setAddress(data?.address || "");
    setLanguage(data?.language || "en");
  }, [navigation]);

  useEffect(() => {
    (async () => {
      try {
        await fetchMe();
      } catch {
        show("Failed to load profile", "danger");
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchMe, show]);

  const hasChanges =
    !loading &&
    (fullName !== original.fullName ||
      email !== original.email ||
      phone !== original.phone ||
      address !== original.address);

  async function saveProfile() {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${API_URL}/users/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName,
          email: email.trim().toLowerCase(),
          phone,
          address,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return show(data?.message || "Update failed", "danger");

      setProfile((p) => ({ ...p, fullName, email, phone, address }));
      setEditModal(false);
      show("Profile updated successfully");
    } catch {
      show("Network error", "danger");
    }
  }

  async function updateUsername() {
    if (!newUsername || newUsername.length < 4)
      return show("Username must be at least 4 characters", "danger");
    if (!/^[A-Za-z0-9_]+$/.test(newUsername))
      return show("Only letters, numbers, underscores", "danger");
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${API_URL}/users/change-username`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newUsername }),
      });
      const data = await res.json();
      if (!res.ok) return show(data?.message || "Update failed", "danger");

      setEmail(newUsername.toLowerCase());
      setProfile((p) => ({ ...p, email: newUsername.toLowerCase() }));
      setAccountModal(false);
      setNewUsername("");
      show("Username successfully changed");
    } catch {
      show("Network error", "danger");
    }
  }

  async function updatePassword() {
    if (!currentPassword || !newPassword || !confirmPassword)
      return show("Fill all password fields", "danger");
    if (newPassword.length < 6)
      return show("New password must be at least 6 characters", "danger");
    if (newPassword !== confirmPassword)
      return show("Passwords do not match", "danger");
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${API_URL}/users/change-password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) return show(data?.message || "Update failed", "danger");

      setAccountModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      show("Password successfully changed");
    } catch {
      show("Network error", "danger");
    }
  }

  async function updateLanguage(next) {
    if (language === next) return;
    try {
      setLanguage(next);
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${API_URL}/users/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ language: next }),
      });
      if (!res.ok) {
        await fetchMe(); 
        show("Failed to save language", "danger");
        return;
      }
      show("Language saved");
    } catch {
      await fetchMe();
      show("Network error", "danger");
    }
  }

  async function doLogout() {
    await AsyncStorage.removeItem("token");
    navigation.replace("Login");
  }

  if (!fontsLoaded || loading) {
    return (
      <SafeAreaView style={s.loadingBox}>
        <ActivityIndicator color={C.text} />
      </SafeAreaView>
    );
  }

  const joinText = `Member since ${new Date(profile.createdAt).toLocaleString("default", {
    month: "long",
    year: "numeric",
  })}`;
  const pointsPct = Math.max(0, Math.min(100, Math.round((Number(points || 0) / 100) * 100)));

  return (
    <SafeAreaView style={s.screen}>
      {Toast}
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }} style={s.bodyPad}>
        {/* Top bar */}
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 6, paddingRight: 10 }}>
            <Ionicons name="chevron-back" size={22} color={C.brand} />
          </TouchableOpacity>
          <Text style={[s.title, s.f700]}>Settings</Text>
        </View>

        {/* Profile card (NO pencil here) */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={[s.sectionTitle, s.f700]}>Profile</Text>
            <Text style={[s.small, { color: C.textSub }]}>Tap to view profile</Text>
          </View>

        <TouchableOpacity style={s.profileRow} onPress={() => setProfileModal(true)}>
            <View style={s.avatar}>
              <Text style={[s.f700, { color: C.white, fontSize: 16 }]}>
                {profile.fullName?.[0]?.toUpperCase() || "U"}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.name, s.f600]}>{profile.fullName}</Text>
              <Text style={[s.small, { color: C.textSub }]}>{joinText}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Language */}
        <View style={s.card}>
          <Text style={[s.sectionTitle, s.f700]}>Language</Text>
          <LangRow active={language === "en"} left="US" right="English" onPress={() => updateLanguage("en")} />
          <LangRow active={language === "tl"} left="PH" right="Tagalog" onPress={() => updateLanguage("tl")} />
          <LangRow active={language === "ceb"} left="PH" right="Cebuano" onPress={() => updateLanguage("ceb")} />
        </View>

        {/* Appearance */}
        <View style={s.card}>
          <Text style={[s.sectionTitle, s.f700]}>Appearance</Text>
          <View style={[s.rowBetween, { marginTop: 10 }]}>
            <View>
              <Text style={[s.label, s.f600]}>Dark Mode</Text>
              <Text style={[s.small, { color: C.textSub }]}>Switch to dark theme</Text>
            </View>
            <Switch value={dark} onValueChange={setDark} />
          </View>
        </View>

        {/* Loyalty */}
        <View style={s.card}>
          <Text style={[s.sectionTitle, s.f700]}>Loyalty Rewards</Text>
          <View style={s.rowBetween}>
            <View>
              <Text style={[s.label, s.f600]}>Current Points</Text>
              <Text style={[s.small, { color: C.textSub }]}>Earn points based on your ride</Text>
            </View>
            <Text style={[s.f700, { color: C.yellow }]}>{points}</Text>
          </View>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${pointsPct}%` }]} />
          </View>
          <View style={s.rowBetween}>
            <Text style={[s.small, { color: C.textSub }]}>Congratulations! You’ve reached the 100 point limit.</Text>
            <Text style={[s.small, { color: C.textSub }]}>Earn up to 100</Text>
          </View>
          <TouchableOpacity disabled style={[s.btn, s.btnGhost, { marginTop: 8 }]}>
            <Text style={[s.f600, { color: C.text }]}>Redeem Rewards</Text>
          </TouchableOpacity>
        </View>

        {/* Terms & Support entries */}
        <TouchableOpacity style={s.card} onPress={() => setTermsModal(true)}>
          <View style={s.rowLeft}>
            <MaterialCommunityIcons name="file-document-outline" size={20} color={C.brand} />
            <Text style={[s.label, s.f600, { marginLeft: 8 }]}>Terms & Privacy</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={s.card} onPress={() => setSupportModal(true)}>
          <View style={s.rowLeft}>
            <MaterialCommunityIcons name="help-circle-outline" size={20} color={C.brand} />
            <Text style={[s.label, s.f600, { marginLeft: 8 }]}>Help & Support</Text>
          </View>
        </TouchableOpacity>

        {/* Logout */}
        <View style={s.card}>
          <TouchableOpacity onPress={() => setLogoutModal(true)} style={s.rowLeft}>
            <MaterialCommunityIcons name="logout" size={20} color={C.danger} />
            <Text style={[s.f600, { color: C.danger, marginLeft: 8 }]}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Profile Modal (pencil lives here) */}
      <Modal visible={profileModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={[s.f700, { fontSize: 16, color: C.brand }]}>Profile</Text>
              <TouchableOpacity onPress={() => setProfileModal(false)}>
                <Ionicons name="close" size={18} color={C.brand} />
              </TouchableOpacity>
            </View>

            <View style={{ alignItems: "center", marginBottom: 10 }}>
              <View style={[s.avatar, { width: 56, height: 56, borderRadius: 28 }]}>
                <Text style={[s.f700, { color: C.white, fontSize: 18 }]}>
                  {profile.fullName?.[0]?.toUpperCase() || "U"}
                </Text>
              </View>
              <Text style={[s.f700, { fontSize: 16, color: C.text, marginTop: 10 }]}>{profile.fullName}</Text>
            </View>

            {/* Personal info box with pencil icon (opens Edit Profile) */}
            <View style={s.infoBoxHeader}>
              <Text style={[s.f600, { color: C.text }]}>Personal Information</Text>
              <TouchableOpacity
                onPress={() => {
                  setProfileModal(false);
                  setEditModal(true);
                }}
                style={s.roundIcon}
              >
                <MaterialCommunityIcons name="pencil-outline" size={16} color={C.brand} />
              </TouchableOpacity>
            </View>
            <View style={s.infoBoxBody}>
              <InfoRow icon="email-outline" text={email} />
              <InfoRow icon="phone-outline" text={phone} />
              <InfoRow icon="map-marker-outline" text={address || "—"} />
              <InfoRow icon="calendar-month-outline" text={joinText} />
            </View>

            <Text style={[s.label, s.f600, { marginTop: 12, color: C.text }]}>Security</Text>
            <TouchableOpacity
              onPress={() => {
                setProfileModal(false);
                setAccountModal(true);
              }}
              style={[s.btn, s.btnGhost, { marginTop: 8 }]}
            >
              <Text style={[s.f600, { color: C.text }]}>Manage Username & Password</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal visible={editModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={[s.f700, { fontSize: 16, color: C.brand }]}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModal(false)}>
                <Ionicons name="close" size={18} color={C.brand} />
              </TouchableOpacity>
            </View>

            <View style={{ alignItems: "center", marginBottom: 10 }}>
              <View style={[s.avatar, { width: 56, height: 56, borderRadius: 28 }]}>
                <Text style={[s.f700, { color: C.white, fontSize: 18 }]}>
                  {fullName?.[0]?.toUpperCase() || "U"}
                </Text>
              </View>
              <TextInput
                style={[s.input, { textAlign: "center", marginTop: 10 }]}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Full Name"
                placeholderTextColor={C.textSub}
              />
            </View>

            <View style={s.infoBoxBody}>
              <EditRow icon="email-outline">
                <TextInput
                  style={s.inputFlat}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="Email"
                  placeholderTextColor={C.textSub}
                />
              </EditRow>
              <EditRow icon="phone-outline">
                <TextInput
                  style={s.inputFlat}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholder="Phone"
                  placeholderTextColor={C.textSub}
                />
              </EditRow>
              <EditRow icon="map-marker-outline">
                <TextInput
                  style={s.inputFlat}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Address"
                  placeholderTextColor={C.textSub}
                />
              </EditRow>
              <EditRow icon="calendar-month-outline">
                <Text style={[s.small, { color: C.textSub }]}>{joinText}</Text>
              </EditRow>
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                onPress={saveProfile}
                disabled={!hasChanges}
                style={[s.btn, s.btnPrimary, { flex: 1, opacity: hasChanges ? 1 : 0.6 }]}
              >
                <Text style={[s.f600, { color: C.white }]}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setFullName(original.fullName);
                  setEmail(original.email);
                  setPhone(original.phone);
                  setAddress(original.address);
                  setEditModal(false);
                }}
                style={[s.btn, s.btnLight, { flex: 1 }]}
              >
                <Text style={[s.f600, { color: C.text }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Account Settings Modal */}
      <Modal visible={accountModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={[s.f700, { fontSize: 16, color: C.brand }]}>Account Settings</Text>
              <TouchableOpacity onPress={() => setAccountModal(false)}>
                <Ionicons name="close" size={18} color={C.brand} />
              </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={s.tabs}>
              <TabBtn label="Username" active={tab === "username"} onPress={() => setTab("username")} />
              <TabBtn label="Password" active={tab === "password"} onPress={() => setTab("password")} />
            </View>

            {tab === "username" ? (
              <>
                <Text style={[s.label, s.f600, { marginBottom: 6 }]}>Change Username</Text>
                <TextInput style={s.input} value={email} editable={false} />
                <TextInput
                  style={s.input}
                  value={newUsername}
                  onChangeText={setNewUsername}
                  placeholder="New Username"
                  placeholderTextColor={C.textSub}
                  autoCapitalize="none"
                />
                <View style={s.tip}>
                  <Text style={[s.small, { color: C.white }]}>
                    • At least 4 characters long{"\n"}• Letters, numbers, and underscores only
                  </Text>
                </View>
                <TouchableOpacity onPress={updateUsername} style={[s.btn, s.btnPrimary, { marginTop: 8 }]}>
                  <Text style={[s.f600, { color: C.white }]}>Update Username</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[s.label, s.f600, { marginBottom: 6 }]}>Change Password</Text>
                <TextInput
                  style={s.input}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Current Password"
                  placeholderTextColor={C.textSub}
                  secureTextEntry
                />
                <TextInput
                  style={s.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="New Password"
                  placeholderTextColor={C.textSub}
                  secureTextEntry
                />
                <TextInput
                  style={s.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm New Password"
                  placeholderTextColor={C.textSub}
                  secureTextEntry
                />
                <View style={s.tip}>
                  <Text style={[s.small, { color: C.white }]}>
                    • At least 6 characters long{"\n"}• Mix of letters, numbers, and special characters
                  </Text>
                </View>
                <TouchableOpacity onPress={updatePassword} style={[s.btn, s.btnPrimary, { marginTop: 8 }]}>
                  <Text style={[s.f600, { color: C.white }]}>Update Password</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Logout Modal */}
      <Modal visible={logoutModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={[s.f700, { fontSize: 16, color: C.brand }]}>Logout</Text>
              <TouchableOpacity onPress={() => setLogoutModal(false)}>
                <Ionicons name="close" size={18} color={C.brand} />
              </TouchableOpacity>
            </View>
            <Text style={[s.label, { marginBottom: 14 }]}>Are you sure you want to logout?</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity onPress={() => setLogoutModal(false)} style={[s.btn, s.btnLight, { flex: 1 }]}>
                <Text style={[s.f600, { color: C.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={doLogout} style={[s.btn, s.btnPrimary, { flex: 1 }]}>
                <Text style={[s.f600, { color: C.white }]}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Terms & Privacy Modal */}
      <Modal visible={termsModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalScrollBox}>
            <View style={s.modalHeader}>
              <Text style={[s.f700, s.modalTitle]}>LigtasCommute Terms and Privacy</Text>
              <TouchableOpacity onPress={() => setTermsModal(false)}>
                <Ionicons name="close" size={18} color={C.brand} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={s.modalP}>
              Last Updated: June 17, 2025{"\n\n"}
              1. Acceptance of Terms{"\n"}
              By using LigtasCommute, you agree to these Terms and Conditions.{"\n\n"}
              2. User Registration{"\n"}
              Provide accurate info and keep it updated.{"\n\n"}
              3. Location and GPS Use{"\n"}
              We use GPS data to track trips and ensure safety.{"\n\n"}
              4. QR Code Verification{"\n"}
              Always confirm the driver/vehicle match.{"\n\n"}
              5. Safety & Emergency Features{"\n"}
              Misuse of emergency alerts may result in suspension.{"\n\n"}
              6. Feedback & Reports{"\n"}
              Use respectful, accurate language when submitting feedback.{"\n\n"}
              7. Privacy Policy{"\n"}
              Your data is stored securely and not shared with advertisers.{"\n\n"}
              8. Changes to Terms{"\n"}
              Continued use after updates means you accept the new terms.
            </Text>
            </ScrollView>
            <TouchableOpacity onPress={() => setTermsModal(false)} style={[s.btn, s.btnPrimary, { marginTop: 12 }]}>
              <Text style={[s.f600, { color: C.white }]}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Help & Support Modal */}
      <Modal visible={supportModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalScrollBox}>
            <View style={s.modalHeader}>
              <Text style={[s.f700, s.modalTitle]}>Help & Support</Text>
              <TouchableOpacity onPress={() => setSupportModal(false)}>
                <Ionicons name="close" size={18} color={C.brand} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={s.modalP}>
              • Close and restart the app{"\n"}
              • Check internet connection{"\n"}
              • Update to the latest version{"\n"}
              • Ensure GPS and camera permissions are enabled
            </Text>

            <Text style={[s.modalH2, { marginTop: 10 }]}>Common Issues</Text>
            <Text style={s.modalP}>
              • Can’t scan QR code? Check camera permissions.{"\n"}
              • Location not updating? Make sure GPS is on.{"\n"}
              • Still stuck? Contact support@ligtascommute.com
            </Text>
            </ScrollView>
            <TouchableOpacity onPress={() => setSupportModal(false)} style={[s.btn, s.btnPrimary, { marginTop: 12 }]}>
              <Text style={[s.f600, { color: C.white }]}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function LangRow({ active, left, right, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[s.langRow, active && s.langRowActive]}>
      <View style={s.langBadge}>
        <Text style={[s.f600, { color: C.white }]}>{left}</Text>
      </View>
      <Text style={[s.f600, { color: active ? C.white : C.text }]}>{right}</Text>
    </TouchableOpacity>
  );
}
function InfoRow({ icon, text }) {
  return (
    <View style={s.infoRow}>
      <MaterialCommunityIcons name={icon} size={18} color={C.brand} />
      <Text style={[s.small, { color: C.text, marginLeft: 8 }]}>{text}</Text>
    </View>
  );
}
function EditRow({ icon, children }) {
  return (
    <View style={s.infoRow}>
      <MaterialCommunityIcons name={icon} size={18} color={C.brand} />
      <View style={{ flex: 1, marginLeft: 8 }}>{children}</View>
    </View>
  );
}
function TabBtn({ label, active, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[s.tab, active && s.tabActive]}>
      <MaterialCommunityIcons
        name={label === "Username" ? "account-outline" : "lock-outline"}
        size={16}
        color={active ? C.white : C.brand}
        style={{ marginRight: 6 }}
      />
      <Text style={[s.f600, active ? s.tabTxtActive : s.tabTxt]}>{label}</Text>
    </TouchableOpacity>
  );
}


const s = StyleSheet.create({
  f400: { fontFamily: "Poppins_400Regular" },
  f600: { fontFamily: "Poppins_600SemiBold" },
  f700: { fontFamily: "Poppins_700Bold" },

  modalTitle: { fontSize: 18, color: C.brand },
  modalH2:     { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 6 },
  modalP:      { fontSize: 13, lineHeight: 20, color: C.text },

  screen: { flex: 1, backgroundColor: C.page },
  loadingBox: { flex: 1, backgroundColor: C.page, alignItems: "center", justifyContent: "center" },
  bodyPad: { paddingHorizontal: 16 },
  title: { fontSize: 18, color: C.text },

  card: {
    backgroundColor: C.card,
    borderRadius: 10,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

  sectionTitle: { color: C.text, fontSize: 14 },
  small: { fontSize: 12, color: C.text },
  label: { fontSize: 13, color: C.text },
  name: { color: C.text, fontSize: 15 },

  rowLeft: { flexDirection: "row", alignItems: "center" },

  profileRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.brand, alignItems: "center", justifyContent: "center",
  },

  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

  langRow: {
    marginTop: 10, height: 44, borderRadius: 8,
    backgroundColor: C.chipBg, borderWidth: 1, borderColor: C.border,
    flexDirection: "row", alignItems: "center", paddingHorizontal: 10, gap: 10,
  },
  langRowActive: { backgroundColor: C.chipActive, borderColor: C.chipActive },
  langBadge: {
    height: 26, minWidth: 40, paddingHorizontal: 8, borderRadius: 6,
    backgroundColor: C.brand, alignItems: "center", justifyContent: "center",
  },

  progressTrack: { height: 8, backgroundColor: C.chipBg, borderRadius: 6, marginTop: 10, overflow: "hidden" },
  progressFill: { height: 8, backgroundColor: C.yellow },

  btn: { height: 44, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  btnPrimary: { backgroundColor: C.brand },
  btnLight: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: C.border },
  btnGhost: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: C.border },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", padding: 16 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },

    modalBox: {
    width: "92%",
    maxWidth: 420,
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  modalScrollBox: {
    width: "92%",
    maxWidth: 420,
    maxHeight: "70%",
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },

  infoBoxHeader: {
    backgroundColor: "#F6F7FB",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  roundIcon: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", backgroundColor: C.white,
  },
  infoBoxBody: {
    backgroundColor: "#F6F7FB",
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: C.border,
    padding: 10,
  },
  infoRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },

  input: {
    height: 44, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 12,
    backgroundColor: C.white, color: C.text,
  },
  inputFlat: {
    height: 40, borderWidth: 1, borderColor: C.border, borderRadius: 6, paddingHorizontal: 10,
    backgroundColor: C.white, color: C.text,
  },

  tabs: { flexDirection: "row", gap: 8, marginBottom: 10 },
  tab: {
    flex: 1, height: 36, borderRadius: 8, borderWidth: 1, borderColor: C.brand,
    alignItems: "center", justifyContent: "center", backgroundColor: "#F9FAFB", flexDirection: "row",
  },
  tabActive: { backgroundColor: C.brand, borderColor: C.brand },
  tabTxt: { color: C.brand },
  tabTxtActive: { color: C.white },

  // toast
  toast: {
    position: "absolute", left: 16, right: 16, top: 10, height: 44, borderRadius: 10,
    zIndex: 50, alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 5,
  },
});
