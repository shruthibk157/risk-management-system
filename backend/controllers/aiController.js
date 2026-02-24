const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const sqlite3 = require('sqlite3').verbose();

// Database setup
const dbPath = path.join(__dirname, '../risk_management.db');
const getDb = () => new sqlite3.Database(dbPath);

// Simulating AI Response (Replace with actual OpenAI/Anthropic call)
const mockAIResponse = (context) => {
    // Basic keyword analysis to make the mock response seem somewhat relevant
    const lowerContext = context.toLowerCase();

    let riskDesc = "Potential quality control failure in production line.";
    let failureMode = "Equipment malfunction or sensor calibration error.";
    let effects = "Production delays and potential non-conforming products reaching customers.";
    let causes = "Lack of regular maintenance schedule or operator error.";

    if (lowerContext.includes('finance') || lowerContext.includes('accounting')) {
        riskDesc = "Financial discrepancy in quarterly reporting.";
        failureMode = "Data entry error or reconciliation failure.";
        effects = "Inaccurate financial statements and potential regulatory fines.";
        causes = "Manual data entry processes and lack of automated validation.";
    } else if (lowerContext.includes('hr') || lowerContext.includes('human resources')) {
        riskDesc = "High employee turnover rate in critical roles.";
        failureMode = "Inadequate retention strategies or competitive market conditions.";
        effects = "Loss of institutional knowledge and increased recruitment costs.";
        causes = "Below-market compensation or poor workplace culture.";
    } else if (lowerContext.includes('it') || lowerContext.includes('security')) {
        riskDesc = "Unauthorized access to sensitive company data.";
        failureMode = "Phishing attack or weak password policies.";
        effects = "Data breach, reputational damage, and legal liability.";
        causes = "Lack of MFA implementation and insufficient security training.";
    }

    return {
        riskDescription: riskDesc,
        failureMode: failureMode,
        effects: effects,
        causes: causes
    };
};

const articulateRisk = async (req, res) => {
    // This endpoint handles the "Rephrase" or "Suggest Controls" features
    // For now, we'll keep it simple or mock it as well
    const { context_text } = req.body;

    // Mock rephrasing
    let responseText = "Improved text based on context.";

    if (context_text && context_text.includes('[REPHRASE_MODE]')) {
        const cleanText = context_text.replace('[REPHRASE_MODE]', '').replace('[RESULTS_MODE]', '').replace('[RECOM_MODE]', '').trim();
        responseText = `Rephrased: ${cleanText} (Professional Standard)`;
    } else if (context_text && context_text.includes('[SUGGEST_CONTROLS]')) {
        responseText = "Suggested Control: Implement automated monitoring system with real-time alerts.";
    }

    // Checking if the frontend expects specific keys
    // effectively returning a generic response for now
    res.json({
        text: responseText,
        rephrased: responseText,
        current_controls_prevention: "Automated checks (AI Suggested)",
        current_controls_detection: "Regular audits (AI Suggested)",
        recommended_actions: "Update SOPs (AI Suggested)",
        actions_taken: "Train staff (AI Suggested)" // Handling various potential targets
    });
};

const generateRisk = async (req, res) => {
    const { department_id } = req.body;

    if (!department_id) {
        return res.status(400).json({ error: "Department ID is required" });
    }

    const db = getDb();

    try {
        // 1. Fetch documents
        const docs = await new Promise((resolve, reject) => {
            db.all("SELECT * FROM documents WHERE department_id = ?", [department_id], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        if (!docs || docs.length === 0) {
            return res.status(400).json({ error: "Please upload department documents first." });
        }

        // 2. Extract Text
        let fullContext = "";

        for (const doc of docs) {
            // Check if file exists
            if (!fs.existsSync(doc.file_path)) {
                console.warn(`File not found: ${doc.file_path}`);
                continue;
            }

            let text = "";
            const ext = path.extname(doc.filename).toLowerCase();

            if (ext === '.pdf') {
                const dataBuffer = fs.readFileSync(doc.file_path);
                const data = await pdf(dataBuffer);
                text = data.text;
            } else if (ext === '.txt' || ext === '.md' || ext === '.json') {
                text = fs.readFileSync(doc.file_path, 'utf8');
            }

            fullContext += `\n--- Document: ${doc.filename} ---\n${text.substring(0, 2000)}`; // Limit context per doc
        }

        if (fullContext.trim().length === 0) {
            return res.status(400).json({ error: "Could not extract text from uploaded documents." });
        }

        // 3. Call AI (Mocked)
        const riskData = mockAIResponse(fullContext);

        // 4. Return formatted response
        res.json({
            risk_description: riskData.riskDescription,
            potential_failure_mode: riskData.failureMode,
            potential_effects: riskData.effects,
            potential_causes: riskData.causes
        });

    } catch (error) {
        console.error("AI Generation Error:", error);
        res.status(500).json({ error: "Failed to generate risk details." });
    } finally {
        db.close();
    }
};

module.exports = {
    generateRisk,
    articulateRisk
};
