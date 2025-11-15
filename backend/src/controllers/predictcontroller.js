import axios from 'axios';
import { supabase } from '../config/supabase.js';
import dotenv from 'dotenv';
dotenv.config();

const RECOMMENDATIONS = {
    stress: [
        "10-min deep breathing or guided meditation",
        "Take 15-min short breaks during work",
        "15-min light physical activity like walking, yoga or stretching"
    ],
    workload: [
        "Break tasks into smaller chunks and focus on one at a time",
        "Set realistic goals for the day and prioritize high-impact tasks",
        "Take 5-min break after completing each major task"
    ],
    hrv: [
        "Drink 1 glass of water every hour to stay hydrated",
        "Maintain a consistent sleep schedule of 7-9 hours per night",
        "Include light movement or relaxation before bedtime"
    ]
};

const getRiskRecommendation = (p_next_hour) => {
    if(p_next_hour >= 0.7) {
        return "High migraine risk today. Consider taking preventive measures such as resting, staying hydrated, and avoiding known triggers.";
    } else if (p_next_hour >= 0.4) {
        return "Moderate migraine risk today. Stay alert to your symptoms, take short breaks and consider light activities that help reduce stress.";
    } else {
        return "Low migraine risk today. Maintain your current routine and continue monitoring your metrics.";
    }
}

const getRecommendedActions = (top_factors) => {
    const recommended_actions = [];
    if (Array.isArray(top_factors) && top_factors.length > 0) {
        top_factors.forEach(factor => {
            const { feature, direction } = factor;
            if (direction === "risk_up" && RECOMMENDATIONS[feature]) {
                recommended_actions.push(...RECOMMENDATIONS[feature]);
            }
        });
    }

    if (recommended_actions.length === 0) {
        recommended_actions.push("No high-risk indicators detected. Keep maintaining a healthy lifestyle and continue monitoring your metrics.");
    }
    return recommended_actions;
}

export const runPrediction = async (req, res) => {
    const userId = 'YZMM';
    const features = ['workload', 'stress', 'hrv'];
    const RISK_THRESHOLD = 0.1;
    const DEBOUNCE_HOURS = 0;

    try {
        const { data: featureData, error: featureError } = await supabase
            .from('features')
            .select('timestamp, workload, stress, hrv')
            .eq('user_id', userId)
            .order('timestamp', { ascending: false })
            .limit(24);

        if (featureError) {
            console.error('Supabase select error:', featureError);
            return res.status(500).json({ error: 'Supabase select failed', details: featureError });
        }

        if (!featureData) {
            return res.status(404).json({ error: 'Not enough feature data found for the user.' });
        }

        const data_series = featureData.reverse();

        const windowData = featureData.map(item => {
            return {
                workload_0_10: item.workload,
                stress_0_10: item.stress,
                hrv_rmssd_ms: item.hrv
            };
        })


        const mlPayload = {
            window: windowData,
            timestamp: Date.now()
        }

        const mlResponse = await axios.post(process.env.ML_URL, mlPayload);

        const {p_next_hour, top_factors, timestamp} = mlResponse.data;

        const { error: insertError } = await supabase
            .from('predictions')
            .insert([
                {
                    user_id: userId,
                    p_next_hour,
                    top_factors,
                    timestamp
                }
            ]);

        if (insertError) throw insertError;

        // Get user's FCM token and last_notified_at
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('fcm_token, last_notified_at')
            .eq('id', userId)
            .single();
        if (userError) throw userError;

        const expoPushToken = userData?.fcm_token || null;
        const lastNotified = userData?.last_notified_at || new Date(0);
        const hoursSince = (Date.now() - new Date(lastNotified).getTime()) / 3600000;

        // Send notification if threshold met and debounce passed
        if (expoPushToken && p_next_hour >= RISK_THRESHOLD && hoursSince >= DEBOUNCE_HOURS) {
            console.log('Sending Expo push to token:', expoPushToken);

            const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
            to: expoPushToken,
            sound: 'default',
            title: '⚠️ Migraine Risk Alert',
            body: `Next-hour risk: ${(p_next_hour * 100).toFixed(0)}%`
            }),
        });

    const expoResBody = await expoRes.json();
    console.log('Expo push response:', expoRes.status, expoResBody);

    if (expoRes.ok && Array.isArray(expoResBody.data) && expoResBody.data[0]?.status === 'ok') {
        await supabase
        .from('users')
        .update({ last_notified_at: new Date().toISOString() })
        .eq('id', userId);

        console.log('Notification sent and timestamp updated');
    } else {
        console.warn('Expo push failed:', expoResBody);
    }
    }

        
        res.json({
            user_id: userId,
            p_next_hour,
            recommendation: getRiskRecommendation(p_next_hour),
            top_factors,
            recommended_actions: getRecommendedActions(top_factors),
            generated_at: timestamp
        });
    } catch (error) {
        console.error('Error running prediction:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}

export const getLatestPrediction = async (req, res) => {
    const userId = 'YZMM';

    try {
        const { data: predictionData, error: predictionError } = await supabase
            .from('predictions')
            .select('p_next_hour, top_factors, timestamp')
            .eq('user_id', userId)
            .order('timestamp', { ascending: false })
            .limit(1);

        if (predictionError) {
            console.error('Supabase select error:', predictionError);
            return res.status(500).json({ error: 'Supabase select failed', details: predictionError });
        }

        if (!predictionData) {
            return res.status(404).json({ error: 'No prediction found for the user.' });
        }

        const latest = predictionData[0];

        res.json({
            ...latest,
            recommendation: getRiskRecommendation(latest.p_next_hour),
            recommended_actions: getRecommendedActions(latest.top_factors)
        })

    } catch (error) {
        console.error('Error fetching latest prediction:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}

console.log('Loaded predictcontroller.js');
