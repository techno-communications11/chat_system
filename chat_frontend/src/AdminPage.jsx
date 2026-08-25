import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  IconButton,
  InputAdornment,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "react-router-dom";
import {
  bulkCreateAdminUsersService,
  createAdminUserService,
  getAdminDashboardService,
  getAdminUserService,
  getAdminUsersService,
  updateAdminUserService,
  changeAdminUserPasswordService,
} from "./Services/chat.services";
import { getTokenUser } from "./utils/authToken";

const roles = ["member", "admin", "superadmin"];
const emptyForm = {
  email: "",
  username: "",
  displayName: "",
  password: "",
  roleName: "member",
  designation: "",
};
const initials = (name = "User") =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const parseCsv = (text) => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((value) => value.trim());
  return lines.slice(1).map((line) => {
    const values = line
      .split(",")
      .map((value) => value.trim().replace(/^"|"$/g, ""));
    return headers.reduce(
      (record, header, index) => ({ ...record, [header]: values[index] || "" }),
      {},
    );
  });
};

function StatCard({ label, value, icon, color }) {
  return (
    <Paper
      sx={{
        p: 2.25,
        flex: "1 1 180px",
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>
            {value}
          </Typography>
        </Box>
        <Avatar sx={{ bgcolor: `${color}1a`, color, width: 44, height: 44 }}>
          {icon}
        </Avatar>
      </Stack>
    </Paper>
  );
}

export default function AdminPage({ embedded = false }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    disabled: 0,
    admins: 0,
  });
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [query, setQuery] = useState({
    search: "",
    status: "all",
    role: "all",
  });
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [selected, setSelected] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [editForm, setEditForm] = useState({
    email: "",
    username: "",
    displayName: "",
    designation: "",
    roleName: "member",
    status: "active",
  });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [statsResponse, usersResponse] = await Promise.all([
        getAdminDashboardService(),
        getAdminUsersService({ ...query, page: 1, limit: 25 }),
      ]);
      setStats(statsResponse.data.data);
      setUsers(usersResponse.data.data.users);
      setPagination(usersResponse.data.data.pagination);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Could not load admin data",
      );
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);
  const currentUser = useMemo(() => getTokenUser(), []);
  const canManage = (currentUser?.roles || []).some((role) =>
    ["admin", "superadmin"].includes(String(role).toLowerCase()),
  );
  if (!canManage)
    return (
      <Box sx={{ minHeight: "100vh", p: 4 }}>
        <Alert severity="error">Administrator access is required.</Alert>
      </Box>
    );

  const updateForm = (field) => (event) =>
    setForm((previous) => ({ ...previous, [field]: event.target.value }));
  const createUser = async () => {
    setSaving(true);
    setError("");
    try {
      await createAdminUserService(form);
      setForm(emptyForm);
      setNotice("User created successfully");
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message);
    } finally {
      setSaving(false);
    }
  };
  const updateUser = async () => {
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      const response = await updateAdminUserService(selected.id, editForm);
      setSelected(response.data.data);
      setEditOpen(false);
      setNotice("User details updated successfully");
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message);
    } finally {
      setSaving(false);
    }
  };
  const changeStatus = async (user) => {
    setSaving(true);
    setError("");
    try {
      await updateAdminUserService(user.id, {
        status: user.status === "active" ? "disabled" : "active",
      });
      setNotice(`User ${user.status === "active" ? "restricted" : "restored"}`);
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message);
    } finally {
      setSaving(false);
    }
  };
  const openDetails = async (user) => {
    setSelected(user);
    setNewPassword("");
    setEditForm({
      email: user.email || "",
      username: user.username || "",
      displayName: user.name || "",
      designation: user.designation || "",
      roleName: user.role || "member",
      status: user.status || "active",
    });
    try {
      const response = await getAdminUserService(user.id);
      const details = response.data.data;
      setSelected(details);
      setEditForm({
        email: details.email || "",
        username: details.username || "",
        displayName: details.name || "",
        designation: details.designation || "",
        roleName: details.role || "member",
        status: details.status || "active",
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message);
    }
  };
  const changePassword = async () => {
    if (!selected || !newPassword) return;
    setSaving(true);
    setError("");
    try {
      await changeAdminUserPasswordService(selected.id, newPassword);
      setNewPassword("");
      setNotice("User password changed successfully");
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message);
    } finally {
      setSaving(false);
    }
  };
  const uploadBulk = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSaving(true);
    setError("");
    try {
      const result = await file.text();
      const rows = parseCsv(result);
      if (!rows.length)
        throw new Error(
          "CSV must include a header row and at least one user row",
        );
      const response = await bulkCreateAdminUsersService(rows);
      const data = response.data.data;
      setNotice(
        `${data.createdCount} users imported${data.failedCount ? `, ${data.failedCount} failed` : ""}`,
      );
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message);
    } finally {
      setSaving(false);
      event.target.value = "";
    }
  };

  return (
    <Box
      sx={{
        height: embedded ? "100%" : "100vh",
        minHeight: embedded ? 0 : "100vh",
        overflow: "auto",
        bgcolor: "background.default",
        p: { xs: 2, md: 4 },
      }}
    >
      <Box sx={{ maxWidth: 1320, mx: "auto" }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 3 }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Avatar sx={{ bgcolor: "primary.main" }}>
              <AdminPanelSettingsOutlinedIcon />
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight={850}>
                Admin console
              </Typography>
              <Typography color="text.secondary">
                Manage access, accounts, and chat users
              </Typography>
            </Box>
          </Stack>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate("/chat-app")}
          >
            Back to chat
          </Button>
        </Stack>
        {error && (
          <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {notice && (
          <Alert
            severity="success"
            onClose={() => setNotice("")}
            sx={{ mb: 2 }}
          >
            {notice}
          </Alert>
        )}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ mb: 3 }}
        >
          <StatCard
            label="Total users"
            value={stats.total}
            color="#6750e8"
            icon={<GroupOutlinedIcon />}
          />
          <StatCard
            label="Active"
            value={stats.active}
            color="#159570"
            icon={<CheckCircleOutlineIcon />}
          />
          <StatCard
            label="Restricted"
            value={stats.disabled}
            color="#d97706"
            icon={<BlockOutlinedIcon />}
          />
          <StatCard
            label="Administrators"
            value={stats.admins}
            color="#db2777"
            icon={<AdminPanelSettingsOutlinedIcon />}
          />
        </Stack>
        <Paper
          sx={{
            border: "1px solid",
            borderColor: "divider",
            overflow: "hidden",
          }}
        >
          <Tabs
            value={tab}
            onChange={(_, value) => setTab(value)}
            sx={{ px: 2, borderBottom: "1px solid", borderColor: "divider" }}
          >
            <Tab label="Users" />
            <Tab label="Create user" />
            <Tab label="Bulk upload" />
          </Tabs>
          {tab === 0 && (
            <Box sx={{ p: 2 }}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={1.5}
                sx={{ mb: 2 }}
              >
                <TextField
                  fullWidth
                  placeholder="Search name, email, username"
                  value={query.search}
                  onChange={(event) =>
                    setQuery({ ...query, search: event.target.value })
                  }
                  InputProps={{
                    startAdornment: (
                      <SearchIcon sx={{ mr: 1, color: "text.secondary" }} />
                    ),
                  }}
                />
                <FormControl sx={{ minWidth: 150 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    label="Status"
                    value={query.status}
                    onChange={(event) =>
                      setQuery({ ...query, status: event.target.value })
                    }
                  >
                    <MenuItem value="all">All statuses</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="disabled">Restricted</MenuItem>
                  </Select>
                </FormControl>
                <FormControl sx={{ minWidth: 150 }}>
                  <InputLabel>Role</InputLabel>
                  <Select
                    label="Role"
                    value={query.role}
                    onChange={(event) =>
                      setQuery({ ...query, role: event.target.value })
                    }
                  >
                    <MenuItem value="all">All roles</MenuItem>
                    {roles.map((role) => (
                      <MenuItem key={role} value={role}>
                        {role}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
              {loading ? (
                <Box sx={{ py: 8, textAlign: "center" }}>
                  <CircularProgress />
                </Box>
              ) : (
                users.map((user) => (
                  <Box
                    key={user.id}
                    sx={{
                      py: 1.25,
                      px: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Avatar src={user.avatarUrl}>{initials(user.name)}</Avatar>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography fontWeight={700} noWrap>
                        {user.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {user.email} · @{user.username}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={user.role}
                      color={user.role === "member" ? "default" : "primary"}
                    />
                    <Chip
                      size="small"
                      label={user.status === "active" ? "Active" : "Restricted"}
                      color={user.status === "active" ? "success" : "warning"}
                      variant="outlined"
                    />
                    <Button
                      size="small"
                      startIcon={<VisibilityOutlinedIcon />}
                      onClick={() => openDetails(user)}
                    >
                      Details
                    </Button>
                    <Button
                      size="small"
                      color={user.status === "active" ? "warning" : "success"}
                      onClick={() => changeStatus(user)}
                      disabled={saving}
                    >
                      {user.status === "active" ? "Restrict" : "Restore"}
                    </Button>
                  </Box>
                ))
              )}
              {!loading && users.length === 0 && (
                <Typography
                  color="text.secondary"
                  sx={{ py: 6, textAlign: "center" }}
                >
                  No users match your filters.
                </Typography>
              )}
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 1 }}
              >
                Showing {users.length} of {pagination.total || 0} users
              </Typography>
            </Box>
          )}
          {tab === 1 && (
            <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 720 }}>
              <Typography variant="h6">Register a user</Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Create a local account and assign its access role.
              </Typography>
              <Stack spacing={2}>
                <TextField
                  label="Display name"
                  value={form.displayName}
                  onChange={updateForm("displayName")}
                />
                <TextField
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={updateForm("email")}
                />
                <TextField
                  label="Username"
                  value={form.username}
                  onChange={updateForm("username")}
                />
                <TextField
                  label="Temporary password"
                  type={showPassword ? "text" : "password"}
                  helperText="At least 8 characters"
                  value={form.password}
                  onChange={updateForm("password")}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="Show password"
                          onClick={() => setShowPassword((visible) => !visible)}
                          edge="end"
                        >
                          {showPassword ? (
                            <VisibilityOffIcon />
                          ) : (
                            <VisibilityIcon />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  label="Designation (optional)"
                  value={form.designation}
                  onChange={updateForm("designation")}
                />
                <FormControl>
                  <InputLabel>Role</InputLabel>
                  <Select
                    label="Role"
                    value={form.roleName}
                    onChange={updateForm("roleName")}
                  >
                    {roles.map((role) => (
                      <MenuItem key={role} value={role}>
                        {role}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  onClick={createUser}
                  disabled={saving}
                >
                  {saving ? "Creating…" : "Create user"}
                </Button>
              </Stack>
            </Box>
          )}
          {tab === 2 && (
            <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 720 }}>
              <Typography variant="h6">Bulk register users</Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Upload a CSV with these headers:{" "}
                <code>
                  email,username,displayName,password,roleName,designation
                </code>
              </Typography>
              <Paper
                variant="outlined"
                sx={{ p: 4, textAlign: "center", borderStyle: "dashed" }}
              >
                <CloudUploadOutlinedIcon
                  color="primary"
                  sx={{ fontSize: 42 }}
                />
                <Typography sx={{ mt: 1, mb: 2 }}>Choose a CSV file</Typography>
                <Button component="label" variant="contained" disabled={saving}>
                  {saving ? "Importing…" : "Upload CSV"}
                  <input
                    hidden
                    type="file"
                    accept=".csv,text/csv"
                    onChange={uploadBulk}
                  />
                </Button>
              </Paper>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 2 }}
              >
                Each row is processed independently. Duplicate email or username
                rows are reported as failures.
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>
      <Dialog
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>User details</DialogTitle>
        <DialogContent>
          {selected && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar src={selected.avatarUrl} sx={{ width: 56, height: 56 }}>
                  {initials(selected.name)}
                </Avatar>
                <Box>
                  <Typography variant="h6">{selected.name}</Typography>
                  <Typography color="text.secondary">
                    {selected.email}
                  </Typography>
                </Box>
              </Stack>
              <Divider />
              {[
                ["Username", selected.username],
                ["Role", selected.role],
                ["Status", selected.status],
                ["Designation", selected.designation || "—"],
                [
                  "Created",
                  selected.createdAt
                    ? new Date(selected.createdAt).toLocaleString()
                    : "—",
                ],
              ].map(([label, value]) => (
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  key={label}
                >
                  <Typography color="text.secondary">{label}</Typography>
                  <Typography fontWeight={650}>{value}</Typography>
                </Stack>
              ))}
              <Divider />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            startIcon={<EditOutlinedIcon />}
            onClick={() => setEditOpen(true)}
            sx={{ borderRadius: 2, px: 2.25, fontWeight: 750 }}
          >
            Edit user
          </Button>
          <Button onClick={() => setSelected(null)}>Close</Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ pb: 1.25, fontWeight: 800 }}>
          Edit user
          <Typography component="span" display="block" variant="body2" color="text.secondary" fontWeight={400} sx={{ mt: 0.5 }}>
            Update profile and access settings
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Display name"
              value={editForm.displayName}
              onChange={(event) =>
                setEditForm({ ...editForm, displayName: event.target.value })
              }
            />
            <TextField
              label="Email"
              value={editForm.email}
              onChange={(event) =>
                setEditForm({ ...editForm, email: event.target.value })
              }
            />
            <TextField
              label="Username"
              value={editForm.username}
              onChange={(event) =>
                setEditForm({ ...editForm, username: event.target.value })
              }
            />
            <TextField
              label="Designation"
              value={editForm.designation}
              onChange={(event) =>
                setEditForm({ ...editForm, designation: event.target.value })
              }
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <FormControl fullWidth size="small" sx={{ minWidth: 0 }}>
                <InputLabel>Role</InputLabel>
                <Select
                  label="Role"
                  value={editForm.roleName}
                  onChange={(event) =>
                    setEditForm({ ...editForm, roleName: event.target.value })
                  }
                >
                  {roles.map((role) => (
                    <MenuItem key={role} value={role}>
                      {role}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small" sx={{ minWidth: 0 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  label="Status"
                  value={editForm.status}
                  onChange={(event) =>
                    setEditForm({ ...editForm, status: event.target.value })
                  }
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="disabled">Restricted</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <Button
              variant="outlined"
              startIcon={<EditOutlinedIcon />}
              onClick={updateUser}
              disabled={saving}
              sx={{ borderRadius: 2, minHeight: 44, fontWeight: 750 }}
            >
              Save user details
            </Button>
            <Divider />
            <Typography fontWeight={750}>Change password</Typography>
            <TextField
              type={showNewPassword ? "text" : "password"}
              label="New password"
              helperText="At least 8 characters"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="Show new password"
                      onClick={() => setShowNewPassword((visible) => !visible)}
                      edge="end"
                    >
                      {showNewPassword ? (
                        <VisibilityOffIcon />
                      ) : (
                        <VisibilityIcon />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="contained"
              onClick={changePassword}
              disabled={saving || newPassword.length < 8}
              sx={{ borderRadius: 2, minHeight: 44, fontWeight: 750 }}
            >
              {saving ? "Saving…" : "Update password"}
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setEditOpen(false)} sx={{ borderRadius: 2 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
