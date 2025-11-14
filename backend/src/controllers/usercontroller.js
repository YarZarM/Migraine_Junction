import { supabase } from "../config/supabase.js";

export const registerFCMToken = async (req, res) => {
  try {
    const { user_id, fcm_token } = req.body;

    if (!user_id || !fcm_token) {
      return res.status(400).json({ error: "Missing user_id or fcm_token" });
    }

    const { error } = await supabase
      .from("users")
      .update({ fcm_token })
      .eq("id", user_id);

    if (error) throw error;

    res.json({ success: true, message: "FCM token saved" });
  } catch (err) {
    console.error("Error saving FCM token:", err);
    res.status(500).json({ error: err.message });
  }
};
