
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const API_URL = "http://localhost:5000";

// Android emulator: use http://10.0.2.2:5000
// Physical phone: use http://YOUR_COMPUTER_LAN_IP:5000

export default function App() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  const [loans, setLoans] = useState([]);
  const [summary, setSummary] = useState({
    total_lent: 0,
    total_repaid: 0,
    overdue_amount: 0,
  });

  const [friendName, setFriendName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");

  const requestOtp = async () => {
    if (!/^\+?[0-9]{10,15}$/.test(phone.trim())) {
      setNotice("Enter a valid phone number.");
      return;
    }

    setLoading(true);
    setNotice("");

    try {
      const response = await fetch(`${API_URL}/auth/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not request OTP.");
      }

      setNotice(`Your mock OTP is ${data.otp}. It expires in 5 minutes.`);
    } catch (error) {
      setNotice(
        `Connection failed: ${error.message}. Check API_URL and ensure the backend is running.`
      );
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!/^[0-9]{6}$/.test(otp.trim())) {
      setNotice("Enter the six-digit OTP.");
      return;
    }

    setLoading(true);
    setNotice("");

    try {
      const response = await fetch(`${API_URL}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim(),
          otp: otp.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed.");
      }

      setUser(data.user);
      setNotice("Login successful.");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboard = useCallback(async () => {
    if (!user) return;

    try {
      const [loanResponse, summaryResponse] = await Promise.all([
        fetch(`${API_URL}/loans?userId=${user.id}`),
        fetch(`${API_URL}/summary/${user.id}`),
      ]);

      if (!loanResponse.ok || !summaryResponse.ok) {
        throw new Error("Unable to load dashboard.");
      }

      const loanData = await loanResponse.json();
      const summaryData = await summaryResponse.json();

      setLoans(loanData);
      setSummary(summaryData);
    } catch (error) {
      setNotice(error.message);
    }
  }, [user]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const addLoan = async () => {
    const cleanName = friendName.trim();
    const cleanAmount = Number(amount);

    if (!cleanName) {
      setNotice("Enter your friend's name.");
      return;
    }

    if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) {
      setNotice("Enter an amount greater than zero.");
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      setNotice("Enter the due date as YYYY-MM-DD.");
      return;
    }

    setLoading(true);
    setNotice("");

    try {
      const response = await fetch(`${API_URL}/loans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          friendName: cleanName,
          amount: cleanAmount,
          dueDate,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not add loan.");
      }

      setFriendName("");
      setAmount("");
      setDueDate("");
      setNotice("Loan added successfully.");

      await loadDashboard();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  };

  const markRepaid = async (loanId) => {
    setLoading(true);
    setNotice("");

    try {
      const response = await fetch(
        `${API_URL}/loans/${loanId}/repaid`,
        { method: "PATCH" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not update loan.");
      }

      setNotice("Loan marked as repaid.");
      await loadDashboard();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (value) =>
    `₹${Number(value || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;

  const isOverdue = (loan) =>
    !loan.is_repaid &&
    String(loan.due_date).slice(0, 10) <
      new Date().toISOString().slice(0, 10);

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#F4F7FB" />
        <KeyboardAvoidingView
          style={styles.centered}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.loginCard}>
            <Text style={styles.logo}>MiniLedger</Text>
            <Text style={styles.subtitle}>
              Keep track of money you lend.
            </Text>

            <Text style={styles.label}>Phone number</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              maxLength={16}
            />

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={requestOtp}
              disabled={loading}
            >
              <Text style={styles.primaryButtonText}>Request OTP</Text>
            </TouchableOpacity>

            <Text style={styles.label}>Six-digit OTP</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter OTP"
              keyboardType="number-pad"
              value={otp}
              onChangeText={setOtp}
              maxLength={6}
            />

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={verifyOtp}
              disabled={loading}
            >
              <Text style={styles.primaryButtonText}>Verify and Login</Text>
            </TouchableOpacity>

            {loading && <ActivityIndicator style={styles.loader} />}

            {!!notice && <Text style={styles.notice}>{notice}</Text>}

            <Text style={styles.helper}>
              Demo app: OTP is generated by the backend for testing.
            </Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F7FB" />

      <ScrollView
        contentContainerStyle={styles.dashboard}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>MiniLedger</Text>
            <Text style={styles.subtitle}>Your lending dashboard</Text>
          </View>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={loadDashboard}
          >
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.accountText}>Phone: {user.phone}</Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Total lent</Text>
          <Text style={styles.totalAmount}>
            {formatMoney(summary.total_lent)}
          </Text>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Repaid</Text>
              <Text style={styles.repaidAmount}>
                {formatMoney(summary.total_repaid)}
              </Text>
            </View>

            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Overdue</Text>
              <Text style={styles.overdueAmount}>
                {formatMoney(summary.overdue_amount)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add a loan</Text>

          <TextInput
            style={styles.input}
            placeholder="Friend's name"
            value={friendName}
            onChangeText={setFriendName}
            maxLength={100}
          />

          <TextInput
            style={styles.input}
            placeholder="Amount in rupees"
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
          />

          <TextInput
            style={styles.input}
            placeholder="Due date (YYYY-MM-DD)"
            value={dueDate}
            onChangeText={setDueDate}
            maxLength={10}
          />

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={addLoan}
            disabled={loading}
          >
            <Text style={styles.primaryButtonText}>Add Loan</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your loans ({loans.length})</Text>

          {loans.length === 0 ? (
            <Text style={styles.emptyText}>No loans yet. Add one above.</Text>
          ) : (
            <FlatList
              data={loans}
              scrollEnabled={false}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => {
                const overdue = isOverdue(item);

                return (
                  <View
                    style={[
                      styles.loanCard,
                      overdue && styles.overdueCard,
                    ]}
                  >
                    <View style={styles.loanTopRow}>
                      <Text style={styles.friendName}>
                        {item.friend_name}
                      </Text>
                      <Text style={styles.loanAmount}>
                        {formatMoney(item.amount)}
                      </Text>
                    </View>

                    <Text style={styles.loanDetail}>
                      Due: {String(item.due_date).slice(0, 10)}
                    </Text>

                    <Text
                      style={[
                        styles.status,
                        item.is_repaid
                          ? styles.statusRepaid
                          : overdue
                          ? styles.statusOverdue
                          : styles.statusPending,
                      ]}
                    >
                      {item.is_repaid
                        ? "REPAID"
                        : overdue
                        ? "OVERDUE"
                        : "PENDING"}
                    </Text>

                    {!item.is_repaid && (
                      <TouchableOpacity
                        style={styles.repayButton}
                        onPress={() => markRepaid(item.id)}
                        disabled={loading}
                      >
                        <Text style={styles.repayButtonText}>
                          Mark as repaid
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              }}
            />
          )}
        </View>

        {loading && <ActivityIndicator style={styles.loader} />}
        {!!notice && <Text style={styles.notice}>{notice}</Text>}

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => {
            setUser(null);
            setOtp("");
            setNotice("");
          }}
        >
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F7FB",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  loginCard: {
    backgroundColor: "#FFFFFF",
    padding: 24,
    borderRadius: 18,
    elevation: 3,
  },
  logo: {
    fontSize: 28,
    fontWeight: "800",
    color: "#173B70",
  },
  subtitle: {
    color: "#667085",
    marginTop: 5,
    marginBottom: 22,
    fontSize: 14,
  },
  label: {
    fontWeight: "600",
    color: "#344054",
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 15,
    color: "#101828",
  },
  primaryButton: {
    backgroundColor: "#2457A7",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  helper: {
    fontSize: 12,
    color: "#667085",
    marginTop: 12,
    lineHeight: 18,
  },
  notice: {
    color: "#344054",
    backgroundColor: "#E8EFFB",
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    lineHeight: 20,
  },
  loader: {
    marginVertical: 12,
  },
  dashboard: {
    padding: 18,
    paddingBottom: 36,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  refreshButton: {
    backgroundColor: "#E1EAF8",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 9,
  },
  refreshText: {
    color: "#173B70",
    fontWeight: "700",
  },
  accountText: {
    color: "#667085",
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: "#173B70",
    borderRadius: 18,
    padding: 20,
    marginBottom: 22,
  },
  summaryTitle: {
    color: "#D9E6FA",
    fontSize: 14,
  },
  totalAmount: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "800",
    marginTop: 6,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    color: "#D9E6FA",
    marginBottom: 5,
  },
  repaidAmount: {
    color: "#9BE7C4",
    fontSize: 18,
    fontWeight: "700",
  },
  overdueAmount: {
    color: "#FFB4AB",
    fontSize: 18,
    fontWeight: "700",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#173B70",
    marginBottom: 14,
  },
  emptyText: {
    color: "#667085",
    paddingVertical: 12,
  },
  loanCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4E7EC",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  overdueCard: {
    borderColor: "#E5484D",
    borderLeftWidth: 5,
  },
  loanTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  friendName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#101828",
    flexShrink: 1,
  },
  loanAmount: {
    fontSize: 17,
    fontWeight: "800",
    color: "#173B70",
  },
  loanDetail: {
    color: "#667085",
    marginTop: 8,
  },
  status: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: 10,
  },
  statusRepaid: {
    color: "#16804A",
  },
  statusOverdue: {
    color: "#D92D20",
  },
  statusPending: {
    color: "#B54708",
  },
  repayButton: {
    borderWidth: 1,
    borderColor: "#2457A7",
    borderRadius: 8,
    alignItems: "center",
    padding: 11,
    marginTop: 12,
  },
  repayButtonText: {
    color: "#2457A7",
    fontWeight: "700",
  },
  logoutButton: {
    alignSelf: "center",
    padding: 12,
  },
  logoutText: {
    color: "#667085",
    fontWeight: "700",
  },
});
