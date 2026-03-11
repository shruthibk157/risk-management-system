const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const sqlite3 = require('sqlite3').verbose();

// Database setup
const dbPath = path.join(__dirname, '../risk_management.db');
const getDb = () => new sqlite3.Database(dbPath);

/**
 * Helper to extract Knowledge Base content for a department
 */
const getKBContent = async (department_id) => {
    if (!department_id) return "";
    const db = getDb();
    try {
        const docs = await new Promise((resolve, reject) => {
            db.all("SELECT * FROM documents WHERE department_id = ?", [department_id], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        let fullContext = "";
        for (const doc of docs) {
            if (doc.extracted_text) {
                fullContext += `\n--- Document: ${doc.filename} ---\n${doc.extracted_text.substring(0, 2000)}`;
            } else if (fs.existsSync(doc.file_path)) {
                let text = "";
                const ext = path.extname(doc.filename).toLowerCase();
                if (ext === '.pdf') {
                    const dataBuffer = fs.readFileSync(doc.file_path);
                    const data = await pdf(dataBuffer);
                    text = data.text;
                } else if (['.txt', '.md', '.json'].includes(ext)) {
                    text = fs.readFileSync(doc.file_path, 'utf8');
                }
                fullContext += `\n--- Document: ${doc.filename} ---\n${text.substring(0, 2000)}`;
            }
        }
        return fullContext;
    } catch (error) {
        console.error("Error fetching KB content:", error);
        return "";
    } finally {
        db.close();
    }
};

/**
 * Strict Articulation Rule Engine
 * Enforces two-sentence structure, removes redundancy, and ensures audit-readiness.
 */
const strictArticulate = (event, cause, impact, requirement) => {
    if (!event || !cause || !impact) return "WEAK_GENERATION";

    const clean = (text) => {
        if (!text) return "";
        let t = text.trim();
        // Remove documentation filler and common redundant phrases
        const fillers = [
            /this document defines[^\.]*\.?/gi,
            /as identified in operational documentation/gi,
            /potential iso 9001 non-conformance/gi,
            /projected impact involves/gi,
            /root cause identified as/gi,
            /failure in/gi,
            /failure of/gi,
            /potential failure in/gi,
            /potential failure of/gi,
            /risk of/gi,
            /may result in/gi,
            /may lead to/gi,
            /leads to/gi,
            /resulting in/gi,
            /causing/gi
        ];
        fillers.forEach(f => t = t.replace(f, ''));
        return t.trim().replace(/\.$/, '');
    };

    const e = clean(event);
    const c = clean(cause);
    const i = clean(impact);

    if (e.length < 3 || c.length < 3 || i.length < 3) return "WEAK_GENERATION";

    // 1. Structure Sentence 1: Event + Cause
    let s1 = `Failure of ${e.toLowerCase()} due to ${c.toLowerCase()} may result in ${i.toLowerCase()}.`;

    // 2. Structure Sentence 2: Business/Compliance Effect
    let s2 = "This could lead to system downtime and disruption to business continuity and compliance.";
    if (i.toLowerCase().includes('security') || e.toLowerCase().includes('security')) {
        s2 = "This could impact data integrity and violate organizational security policies.";
    } else if (i.toLowerCase().includes('safety') || e.toLowerCase().includes('safety')) {
        s2 = "This could result in workplace hazards and significant regulatory penalties.";
    } else if (i.toLowerCase().includes('financial') || i.toLowerCase().includes('audit')) {
        s2 = "This could lead to material financial discrepancies and negative audit outcomes.";
    }

    // Anti-Repetition & Cleaning
    let finalRD = `${s1.charAt(0).toUpperCase() + s1.slice(1)} ${s2}`;

    // Remove if requirement text is restated verbatim (Rule 1)
    if (requirement && finalRD.toLowerCase().includes(requirement.toLowerCase())) {
        const regex = new RegExp(requirement.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        finalRD = finalRD.replace(regex, "defined process controls");
    }

    return finalRD;
};

/**
 * Strict FMEA Parser
 * Ensures Mode, Effects, and Causes are logically distinct and non-repetitive.
 */
const strictFMEA = (event, cause, impact) => {
    const clean = (text) => {
        return text.trim().charAt(0).toUpperCase() + text.trim().slice(1).replace(/\.$/, '');
    };

    // Failure Mode: Short phrase (what fails)
    let mode = clean(event);
    if (!mode.toLowerCase().includes('failure') && !mode.toLowerCase().includes('not') && !mode.toLowerCase().includes('error')) {
        mode = `${mode} not functioning properly or failing to execute.`;
    }

    // Effects: Consequences (what happens)
    const effectsList = [
        clean(impact),
        "Disruption to operational continuity",
        "Potential compliance risk and non-conformance"
    ];
    if (impact.toLowerCase().includes('data')) effectsList.push("Permanent loss of critical organizational data");
    if (impact.toLowerCase().includes('security')) effectsList.push("Unauthorized access to sensitive systems");

    // Causes: Root reasons (why)
    const causesList = [
        `Inadequate ${cause.toLowerCase()}`,
        "Lack of automated verification or monitoring controls",
        "Legacy infrastructure or unsupported system protocols"
    ];

    return {
        mode: mode,
        effects: effectsList.slice(0, 4).join('\n• '),
        causes: causesList.slice(0, 4).join('\n• ')
    };
};

/**
 * Advanced RPN-Influenced FMEA Response
 * @param {string} context - The analysis context
 * @param {string} departmentName - Department name
 * @param {object} scores - S, O, D scores (optional)
 * @returns {object} Highly structured FMEA data
 */
const mockAIResponse = (context, departmentName = "", scores = null) => {
    const lowerContext = context.toLowerCase();
    const isIT = lowerContext.includes('it') || lowerContext.includes('server') || lowerContext.includes('patch') || departmentName.toLowerCase().includes('it');
    const isFinance = lowerContext.includes('finance') || lowerContext.includes('accounting') || departmentName.toLowerCase().includes('finance');
    const isHR = lowerContext.includes('hr') || lowerContext.includes('human resources') || departmentName.toLowerCase().includes('hr');
    const isProduction = lowerContext.includes('production') || lowerContext.includes('manufacturing') || lowerContext.includes('quality') || departmentName.toLowerCase().includes('production');

    const s = parseInt(scores?.severity || 3);
    const o = parseInt(scores?.occurrence || 2);
    const d = parseInt(scores?.detection || 3);
    const rpn = s * o * d;

    // Default ISO-aligned professional terminology
    let riskDesc = "Potential non-conformance in quality control processes.";
    let failureMode = "Operational process deviation or control bypass.";
    let effects = "Operational disruption, potential compliance breach, and quality degradation.";
    let causes = "Inadequate process monitoring, human error, or system calibration drift.";

    // Knowledge Base Pattern Extraction (Simulated)
    const hasKBPatterns = lowerContext.includes('incident') || lowerContext.includes('report') || lowerContext.includes('history');
    const kbTerminology = lowerContext.includes('thermal control failure') ? "Thermal Control Failure" :
        lowerContext.includes('calibration error') ? "Sensor Calibration Non-Conformance" : null;

    if (isIT) {
        if (lowerContext.includes('patch')) {
            riskDesc = "Critical security vulnerability exploitation due to delayed patch management.";
            failureMode = kbTerminology || "Unauthorized system access or malicious payload execution.";

            if (rpn > 75) {
                effects = "• Data integrity loss across core enterprise systems\n• Significant system downtime exceeding 48hr SLA\n• Regulatory non-compliance with potential mandatory breach reporting";
                causes = "• Failure to apply security patches within strictly defined 48-hour SLA\n• Legacy infrastructure incompatible with modern patching protocols\n• Monitoring systems failed to alert on missing critical updates";
            } else if (rpn > 25) {
                effects = "• Potential data integrity loss\n• Partial system disruption affecting department operations";
                causes = "• Patch window missed during manual maintenance cycle\n• Configuration drift in server patch levels";
            }
        } else if (lowerContext.includes('backup')) {
            riskDesc = "Catastrophic loss of business-critical data due to recovery failure.";
            failureMode = kbTerminology || "Data corruption or storage hardware failure without restorable redundancy.";

            if (rpn > 75) {
                effects = "• Permanent loss of institutional knowledge and transactional data\n• Business continuity failure for mission-critical services\n• Total loss of stakeholder and customer trust";
                causes = "• Inadequate disaster recovery testing cycles\n• Backup verification gaps combined with hardware hardware wear\n• Absence of off-site immutable backup tier";
            } else {
                effects = "Business continuity disruption and temporary data unavailability.";
                causes = "Inadequate recovery testing and backup verification gaps.";
            }
        } else {
            riskDesc = "Unauthorized breach of sensitive organizational data.";
            failureMode = "Credential compromise or weak access control policies.";
        }
    } else if (isFinance) {
        riskDesc = "Material financial discrepancy in mandatory reporting.";
        failureMode = "Reconciliation failure or manual data entry inconsistency.";
    } else if (isProduction || (!isIT && !isFinance && !isHR)) {
        if (kbTerminology) {
            failureMode = `${kbTerminology} (KB Documented Pattern)`;
        }
        if (rpn > 75) {
            effects = "• Production line halt resulting in customer contractual penalties\n• Quality non-conformance affecting batch reliability\n• Systemic failure of quality management control points";
            causes = "• Sub-optimal preventive maintenance schedule\n• Legacy hardware fatigue exceeding design lifecycle\n• Human error due to process complexity and lack of digital checklists";
        }
    }

    // Professional Structure Formatting based on RPN
    const formatFMEA = (text) => {
        if (rpn <= 25) return text.replace(/• /g, '').split('\n')[0]; // Concise for Low
        return text; // Structured for Moderate/High
    };

    return {
        riskDescription: riskDesc,
        failureMode: formatFMEA(failureMode),
        effects: formatFMEA(effects),
        causes: formatFMEA(causes),
        kb_assisted: !!kbTerminology || hasKBPatterns,
        rpn_context: rpn > 75 ? 'High' : rpn > 25 ? 'Moderate' : 'Low'
    };
};

const validateRequirement = async (req, res) => {
    const { requirement_text, department_id } = req.body;
    const kbContent = await getKBContent(department_id);
    const lowerKb = kbContent.toLowerCase();

    if (!requirement_text || requirement_text.trim().length < 5) {
        return res.json({
            valid: false,
            title: "Requirement Clarification Required",
            explanation: "The entry is too brief to establish a formal ISO 9001 process context.",
            suggestion: "Specify a precise process control, e.g., 'Ensure all calibrated monitoring equipment is verified bi-annually as per ISO 9001:2015 Clause 7.1.5'.",
            rearticulatedRisk: "Potential failure to maintain process compliance due to lack of defined requirement controls."
        });
    }

    const isProcessOriented = /process|workflow|procedure|system|operation|control|monitor|ensure|maintain|policy|standard|clause|sla|protocol/i.test(requirement_text);
    const isVague = requirement_text.split(' ').length < 3 || /stuff|thing|fix|bad|broken|wrong/i.test(requirement_text);
    const hasISO = /iso|9001|2015|clause|qms|sop|policy/i.test(requirement_text);

    if (!isProcessOriented || isVague || !hasISO) {
        let suggestion = `Align "${requirement_text}" with ISO 9001:2015 technical documentation standards.`;
        let explanation = "The entered requirement does not provide sufficient clarity for structured risk articulation or lacks specific QMS/ISO alignment.";
        let rearticulatedRisk = `Potential risk regarding ${requirement_text} due to lack of defined process controls.`;

        const lowerReq = requirement_text.toLowerCase();

        // Check KB for context-specific suggestions
        if (lowerKb.includes('security') && (lowerReq.includes('patch') || lowerReq.includes('server') || lowerReq.includes('it'))) {
            suggestion = "Deploy all security patches within 48 hours of release to maintain compliance with IT Security Policy and ISO 9001:2015 controls.";
            explanation = "The requirement is vague. IT process requirements should reference specific security SLAs and ISO controls found in the Knowledge Base.";
            rearticulatedRisk = "Critical security vulnerability exploitation due to delayed patch management procedures.";
        } else if (lowerKb.includes('backup') && (lowerReq.includes('backup') || lowerReq.includes('data'))) {
            suggestion = "Implement automated daily backup verification and monthly recovery testing as per ISO 9001:2015 Clause 8.1.";
            explanation = "Requirements for data integrity must specify verification frequency and recovery protocols as per organizational policy.";
            rearticulatedRisk = "Catastrophic loss of business-critical data due to recovery failure or backup corruption.";
        } else if (lowerReq.includes('patch') || lowerReq.includes('server') || lowerReq.includes('it')) {
            suggestion = "Ensure all IT systems are updated with latest security patches as per ISO 9001:2015 process controls.";
            rearticulatedRisk = "Potential unauthorized access due to unpatched system vulnerabilities.";
        } else if (lowerReq.includes('backup') || lowerReq.includes('data')) {
            suggestion = "Maintain robust data backup protocols in accordance with ISO 9001:2015 Clause 8.1.";
            rearticulatedRisk = "Data loss risk due to inadequate backup and recovery procedures.";
        }

        return res.json({
            valid: false,
            title: "Requirement Needs Clarification",
            explanation: explanation,
            suggestion: suggestion,
            rearticulatedRisk: rearticulatedRisk
        });
    }

    res.json({ valid: true });
};

const validateDescription = async (req, res) => {
    const { risk_description } = req.body;

    if (!risk_description || risk_description.trim().length < 15) {
        return res.json({
            valid: false,
            title: "Risk Articulation Required",
            message: "Please provide a professional risk description to enable FMEA scoring.",
            suggestion: ""
        });
    }

    const hasContext = risk_description.split(' ').length >= 8;
    const hasImpact = /lead to|result in|impact|consequence|cause|disruption|failure|breach|loss|delay|risk of/i.test(risk_description);

    if (!hasContext || !hasImpact) {
        return res.json({
            valid: false,
            title: "Risk Articulation Incomplete",
            message: "FMEA Standards require: • Failure Event • Contextual Process • Operational Impact",
            suggestion: ""
        });
    }

    res.json({ valid: true });
};

const articulateRisk = async (req, res) => {
    const { requirement, risk_description, department_id, context_text } = req.body;
    const ctx = context_text || "";
    const isMagicPrompt = ctx.includes('[MAGIC_PROMPT_MODE]');

    let rd = risk_description || "";
    let kbHint = "";

    if (isMagicPrompt && ctx.includes('Focus on')) {
        const reqText = ctx.split('Focus on')[1]?.trim() || "Operational Processes";
        const kb = await getKBContent(department_id);

        // Simulation of KB-driven generation
        if (kb && kb.toLowerCase().includes(reqText.toLowerCase().split(' ')[0])) {
            kbHint = " (Synthesized from Knowledge Base)";
            const kbMatch = kb.split('\n').find(line => line.toLowerCase().includes(reqText.toLowerCase().split(' ')[0]));
            rd = `Failure in ${reqText} may result in process degradation as identified in operational documentation: ${kbMatch?.substring(0, 50) || 'procedural non-conformance'}.`;
        } else {
            rd = `Failure in ${reqText} may result in process disruption and non-conformance to standard operating procedures.`;
        }
    }

    // Specialized Step 2 Handling
    if (ctx.includes('[SUGGEST_CONTROLS]')) {
        const riskDesc = risk_description || "Potential operational failure";
        const lowerRisk = riskDesc.toLowerCase();

        let prev = "Implement standardized verification protocols and periodic audits.";
        let det = "Establish automated alerts and monitoring for process deviations.";

        if (lowerRisk.includes('patch') || lowerRisk.includes('security')) {
            prev = "Automated patch management system with 48-hour deployment window.";
            det = "Vulnerability scanning and compliance dashboard monitoring.";
        } else if (lowerRisk.includes('backup') || lowerRisk.includes('data')) {
            prev = "Redundant storage arrays with daily incremental off-site synchronization.";
            det = "Daily automated restorable verification and monthly recovery drills.";
        } else if (lowerRisk.includes('quality') || lowerRisk.includes('production')) {
            prev = "Calibrated sensor arrays with fail-safe interlock mechanisms.";
            det = "Statistical process control (SPC) with real-time variance detection.";
        }

        return res.json({
            current_controls_prevention: prev,
            current_controls_detection: det,
            text: ctx.includes('Detection') ? det : prev
        });
    }

    if (ctx.includes('[REPHRASE_MODE]')) {
        const parts = ctx.split('] ');
        const originalText = parts[parts.length - 1]?.trim() || "";

        if (!originalText || originalText.length < 3) {
            return res.json({ text: originalText, rephrased: originalText });
        }

        let rephrasedText = originalText;
        if (ctx.includes('[RESULTS_MODE]')) {
            rephrasedText = `Verified ${originalText}. All identified process non-conformances addressed and validated.`;
        } else if (ctx.includes('[RECOM_MODE]')) {
            rephrasedText = `Conduct comprehensive review of ${originalText} to ensure ISO 9001 compliance.`;
        } else {
            rephrasedText = `Optimize ${originalText} through enhanced control measures and monitoring.`;
        }

        return res.json({
            text: rephrasedText,
            rephrased: rephrasedText
        });
    }

    const lowerDesc = rd.toLowerCase();

    let event = rd || "Potential operational failure";
    let cause = "Inadequate oversight or resource constraints affecting the specified process.";
    let impact = "Systemic failure leading to potential operational downtime and negative audit outcomes.";

    // Domain-specific defaults if magic prompted
    if (isMagicPrompt) {
        const lowerCtx = ctx.toLowerCase();
        if (lowerCtx.includes('skill') || lowerCtx.includes('competenc') || lowerCtx.includes('training') || lowerCtx.includes('staff')) {
            cause = "Inadequate training programs or high staff turnover affecting skill retention.";
            impact = "Operational errors and quality non-conformance due to lack of technical competency.";
        } else if (lowerCtx.includes('server') || lowerCtx.includes('it') || lowerCtx.includes('backup') || lowerCtx.includes('data')) {
            cause = "Infrastructure obsolescence or missing automated verification protocols.";
            impact = "Data loss risk and critical system unavailability affecting business continuity.";
        } else if (lowerCtx.includes('safety') || lowerCtx.includes('hazard')) {
            cause = "Non-compliance with safety protocols or equipment maintenance negligence.";
            impact = "Workplace accidents and significant regulatory penalties for non-conformance.";
        }
    }

    // Robust Extraction Logic
    if (lowerDesc.includes('due to') || lowerDesc.includes('because')) {
        const parts = lowerDesc.split(/due to|because/i);
        const beforeCause = parts[0].trim();
        cause = parts[1].split('.')[0].trim();

        if (beforeCause.includes('result in') || beforeCause.includes('leads to') || beforeCause.includes('causing')) {
            const innerParts = beforeCause.split(/result in|leads to|causing/i);
            event = innerParts[0].trim();
            impact = innerParts[1].trim();
        } else {
            event = beforeCause;
        }
    } else if (lowerDesc.includes('result in') || lowerDesc.includes('leads to') || lowerDesc.includes('causing')) {
        const parts = lowerDesc.split(/result in|leads to|causing/i);
        event = parts[0].trim();
        impact = parts[1].split('.')[0].trim();
    }

    const cleanInput = (text, prefix) => {
        if (!text) return "";
        let clean = text.trim();
        // Remove prefix if exists
        if (prefix && clean.toLowerCase().startsWith(prefix.toLowerCase())) {
            clean = clean.substring(prefix.length).trim();
        }
        // Remove common redundant starters
        const starters = ['failure in', 'potential failure in', 'risk of'];
        for (const s of starters) {
            if (clean.toLowerCase().startsWith(s)) {
                clean = clean.substring(s.length).trim();
            }
        }
        return clean.charAt(0).toUpperCase() + clean.slice(1);
    };

    const finalRephrased = strictArticulate(event, cause, impact, requirement);

    if (finalRephrased === "WEAK_GENERATION") {
        return res.json({
            status: "WEAK_GENERATION",
            message: "Risk articulation could not meet quality standards. Please provide more context."
        });
    }

    const lowerContext = (finalRephrased + " " + ctx).toLowerCase();
    let severity = 3;
    let occurrence = 2;
    let detection = 3;

    if (/critical|severe|catastrophic|legal|regulatory|fines|breach|security|safety|fatal/i.test(lowerContext)) severity = 5;
    else if (/major|significant|loss|halt|customer|quality|financial/i.test(lowerContext)) severity = 4;

    if (/frequent|often|daily|regularly|always|continually/i.test(lowerContext)) occurrence = 4;
    else if (/occasionally|sometimes|periodic|monthly/i.test(lowerContext)) occurrence = 3;

    if (/hidden|unknown|unmonitored|none|unavailable|invisible/i.test(lowerContext)) detection = 4;
    else if (/manual|periodic|sample|check-based/i.test(lowerContext)) detection = 3;

    const articulationJustification = {
        severity: severity >= 4 ? "Significant impact affecting business continuity or regulatory compliance." : "Moderate operational disruption with localized scope.",
        occurrence: occurrence >= 3 ? "Recurrent or periodic occurrence based on process exposure." : "Rare occurrence in a stable or mature process environment.",
        detection: detection >= 3 ? "Manual detection during periodic reviews or unmonitored process." : "Automated real-time monitoring and alert systems in place."
    };

    const fmea = strictFMEA(event, cause, impact);

    res.json({
        rephrased: finalRephrased,
        description: finalRephrased,
        articulation: {
            event: event.charAt(0).toUpperCase() + event.slice(1),
            cause: cause.charAt(0).toUpperCase() + cause.slice(1),
            impact: impact.charAt(0).toUpperCase() + impact.slice(1)
        },
        failure_mode: fmea.mode,
        effects: fmea.effects,
        causes: fmea.causes,
        scores: {
            severity,
            occurrence,
            detection
        },
        justification: articulationJustification
    });
};

const validateScoring = async (req, res) => {
    const { risk_description, requirement_process_area, severity, occurrence, detection } = req.body;
    const lowerDesc = ((risk_description || "") + " " + (requirement_process_area || "")).toLowerCase();

    // 1. Severity Validation (ISO 9001 Impact)
    let recommendedSeverity = 3;
    if (/critical|severe|catastrophic|legal|regulatory|fines|breach|security|safety|fatal/i.test(lowerDesc)) recommendedSeverity = 5;
    else if (/major|significant|loss|halt|customer|quality|financial/i.test(lowerDesc)) recommendedSeverity = 4;

    const severityJustification = recommendedSeverity === 5 ? "Critical impact affecting business continuity and high regulatory risk." :
        recommendedSeverity === 4 ? "Major operational impact and significant customer/quality disruption." :
            "Moderate operational disruption with localized impact scope.";

    // 2. Occurrence Validation (Probability)
    let recommendedOccurrence = 2;
    if (/frequent|often|daily|regularly|always|continually/i.test(lowerDesc)) recommendedOccurrence = 4;
    else if (/occasionally|sometimes|periodic|monthly/i.test(lowerDesc)) recommendedOccurrence = 3;

    const occurrenceJustification = recommendedOccurrence === 4 ? "Frequent occurrence likely due to continuous process exposure." :
        recommendedOccurrence === 3 ? "Possible occurrence based on periodic or inconsistent process controls." :
            "Rare occurrence as process environment is stable or mature.";

    // 3. Detection Validation (Control Maturity)
    let recommendedDetection = 3;
    if (/hidden|unknown|unmonitored|none|unavailable|invisible/i.test(lowerDesc)) recommendedDetection = 5;
    else if (/manual|periodic|sample|check-based/i.test(lowerDesc)) recommendedDetection = 3;
    else if (/automated|alerts|real-time/i.test(lowerDesc)) recommendedDetection = 1;

    const detectionJustification = recommendedDetection >= 4 ? "Very difficult to detect before impact due to lack of monitoring." :
        recommendedDetection >= 3 ? "Detected manually during periodic review, allowing for potential slippage." :
            "Easily detected by automated controls or real-time monitoring.";

    res.json({
        severity: { value: recommendedSeverity, justification: severityJustification, user_mismatch: severity && parseInt(severity) !== recommendedSeverity },
        occurrence: { value: recommendedOccurrence, justification: occurrenceJustification, user_mismatch: occurrence && parseInt(occurrence) !== recommendedOccurrence },
        detection: { value: recommendedDetection, justification: detectionJustification, user_mismatch: detection && parseInt(detection) !== recommendedDetection }
    });
};

const logAIAction = async (req, res) => {
    const { risk_id, action_type, original_input, ai_suggestion, user_decision, final_value, justification, rpn, kb_assisted } = req.body;
    const user_id = req.user?.id || 1;

    const db = getDb();
    const query = `INSERT INTO ai_audit_logs (user_id, risk_id, action_type, original_input, ai_suggestion, user_decision, final_value, justification) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    // Note: Database schema might need update for rpn/kb_assisted, keeping simple for now
    db.run(query, [user_id, risk_id, action_type, original_input, ai_suggestion, user_decision, final_value, justification], function (err) {
        if (err) {
            console.error("Failed to log AI action:", err);
            return res.status(500).json({ error: "Failed to log AI action" });
        }
        res.json({ id: this.lastID, message: "AI action logged successfully" });
        db.close();
    });
};

const generateRisk = async (req, res) => {
    const { department_id, severity, occurrence, detection, context_text } = req.body;

    if (!department_id) {
        return res.status(400).json({ error: "Department ID is required" });
    }

    const db = getDb();

    try {
        const docs = await new Promise((resolve, reject) => {
            db.all("SELECT * FROM documents WHERE department_id = ?", [department_id], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        if (!docs || docs.length === 0) {
            return res.status(400).json({ error: "Please upload department documents (Knowledge Base) first." });
        }

        let fullContext = context_text || "";
        for (const doc of docs) {
            if (!fs.existsSync(doc.file_path)) continue;

            let text = "";
            const ext = path.extname(doc.filename).toLowerCase();

            if (ext === '.pdf') {
                const dataBuffer = fs.readFileSync(doc.file_path);
                const data = await pdf(dataBuffer);
                text = data.text;
            } else if (['.txt', '.md', '.json'].includes(ext)) {
                text = fs.readFileSync(doc.file_path, 'utf8');
            }
            fullContext += `\n--- Document: ${doc.filename} ---\n${text.substring(0, 2000)}`;
        }

        if (fullContext.trim().length === 0) {
            return res.status(400).json({ error: "Could not extract intelligence from Knowledge Base." });
        }

        const dept = await new Promise((resolve) => {
            db.get("SELECT name FROM departments WHERE id = ?", [department_id], (err, row) => {
                resolve(row);
            });
        });

        const riskData = mockAIResponse(fullContext, dept ? dept.name : "", { severity, occurrence, detection });

        res.json({
            risk_description: riskData.riskDescription,
            potential_failure_mode: riskData.failureMode,
            potential_effects: riskData.effects,
            potential_causes: riskData.causes,
            kb_assisted: riskData.kb_assisted,
            rpn_context: riskData.rpn_context
        });

    } catch (error) {
        console.error("AI Generation Error:", error);
        res.status(500).json({ error: "Failed to process Knowledge Base documents." });
    } finally {
        db.close();
    }
};

const analyzeRisk = async (req, res) => {
    const { requirement_text, risk_description, department_id } = req.body;
    const kbContent = await getKBContent(department_id);
    const lowerKb = kbContent.toLowerCase();

    // 1. Requirement Analysis
    let reqAnalysis = { valid: true };
    const isReqProcessOriented = /process|workflow|procedure|system|operation|control|monitor|ensure|maintain|policy|standard|clause|sla|protocol/i.test(requirement_text);
    const isReqVague = (requirement_text || "").split(' ').length < 3 || /stuff|thing|fix|bad|broken|wrong/i.test(requirement_text);
    const hasISO = /iso|9001|2015|clause|qms|sop|policy/i.test(requirement_text);

    if (!requirement_text || requirement_text.trim().length < 5 || !isReqProcessOriented || isReqVague || !hasISO) {
        let suggestion = `Align "${requirement_text}" with ISO 9001:2015 technical documentation standards.`;
        let explanation = "The entered requirement does not provide sufficient clarity for structured risk articulation or lacks specific QMS/ISO alignment.";
        const lowerReq = (requirement_text || "").toLowerCase();

        if (lowerKb.includes('security') && (lowerReq.includes('patch') || lowerReq.includes('server') || lowerReq.includes('it'))) {
            suggestion = "Deploy all security patches within 48 hours of release to maintain compliance with IT Security Policy and ISO 9001:2015 controls.";
            explanation = "IT process requirements should reference specific security SLAs and ISO controls found in the Knowledge Base.";
        } else if (lowerKb.includes('backup') && (lowerReq.includes('backup') || lowerReq.includes('data'))) {
            suggestion = "Implement automated daily backup verification and monthly recovery testing as per ISO 9001:2015 Clause 8.1.";
            explanation = "Requirements for data integrity must specify verification frequency and recovery protocols as per organizational policy.";
        } else if (lowerReq.includes('patch') || lowerReq.includes('server') || lowerReq.includes('it')) {
            suggestion = "Ensure all IT systems are updated with latest security patches as per ISO 9001:2015 process controls.";
        } else if (lowerReq.includes('backup') || lowerReq.includes('data')) {
            suggestion = "Maintain robust data backup protocols in accordance with ISO 9001:2015 Clause 8.1.";
        }

        reqAnalysis = {
            valid: false,
            explanation,
            suggestion,
            original: requirement_text
        };
    }

    // 2. Risk Description Analysis
    let descAnalysis = { valid: true };
    const rd = risk_description || "";
    const effectiveRequirement = reqAnalysis.valid ? requirement_text : reqAnalysis.suggestion;

    // STEP 1: SEMANTIC VALIDATION
    const isMeaningless = (text) => {
        if (!text || text.trim().length < 5) return true;

        // Garbage detection: high consonant ratio or no spaces in long text
        const vowels = text.match(/[aeiouy]/gi) || [];
        const consonants = text.match(/[bcdfghjklmnpqrstvwxyz]/gi) || [];
        if (consonants.length > 0 && vowels.length === 0 && text.length > 5) return true;
        if (vowels.length > 0 && consonants.length / vowels.length > 6) return true;

        const words = text.trim().split(/\s+/);
        if (words.length < 2 && text.length > 10) return true; // Long string, no spaces

        // Lack of identifiable operational words
        const operationalKeywords = ['risk', 'fail', 'error', 'delay', 'loss', 'system', 'process', 'data', 'backup', 'security', 'access', 'impact', 'issue', 'broken', 'stop', 'limit', 'slow', 'leak', 'crash'];
        const hasKeywords = operationalKeywords.some(k => text.toLowerCase().includes(k));
        if (words.length < 3 && !hasKeywords) return true;

        return false;
    };

    if (isMeaningless(rd)) {
        descAnalysis = {
            valid: false,
            interpretation_failed: true,
            issues: [
                "No identifiable risk trigger",
                "No defined impact",
                "No measurable context",
                "Cannot determine Severity, Occurrence, or Detection"
            ],
            example: "Failure of automated backup verification may result in inability to restore critical systems, causing operational disruption.",
            original: rd
        };
    } else {
        const hasContext = rd.split(' ').length >= 8;
        const hasImpact = /lead to|result in|impact|consequence|cause|disruption|failure|breach|loss|delay|risk of/i.test(rd);

        // Always produce re-articulation
        const lowerDesc = rd.toLowerCase();

        let event = rd || "Potential operational failure";
        let cause = "Inadequate oversight or resource constraints affecting the specified process.";
        let impact = "Systemic failure leading to potential operational downtime and negative audit outcomes.";

        // Domain-specific defaults
        const lowerReq = effectiveRequirement.toLowerCase();
        if (lowerReq.includes('skill') || lowerReq.includes('competenc') || lowerReq.includes('training') || lowerReq.includes('staff')) {
            cause = "Inadequate training programs or high staff turnover affecting skill retention.";
            impact = "Operational errors and quality non-conformance due to lack of technical competency.";
        } else if (lowerReq.includes('server') || lowerReq.includes('it') || lowerReq.includes('backup') || lowerReq.includes('data')) {
            cause = "Infrastructure obsolescence or missing automated verification protocols.";
            impact = "Data loss risk and critical system unavailability affecting business continuity.";
        } else if (lowerReq.includes('safety') || lowerReq.includes('hazard')) {
            cause = "Non-compliance with safety protocols or equipment maintenance negligence.";
            impact = "Workplace accidents and significant regulatory penalties for non-conformance.";
        }

        // Robust Extraction Logic
        if (lowerDesc.includes('due to') || lowerDesc.includes('because')) {
            const parts = lowerDesc.split(/due to|because/i);
            const beforeCause = parts[0].trim();
            cause = parts[1].split('.')[0].trim();

            if (beforeCause.includes('result in') || beforeCause.includes('leads to') || beforeCause.includes('causing')) {
                const innerParts = beforeCause.split(/result in|leads to|causing/i);
                event = innerParts[0].trim();
                impact = innerParts[1].trim();
            } else {
                event = beforeCause;
            }
        } else if (lowerDesc.includes('result in') || lowerDesc.includes('leads to') || lowerDesc.includes('causing')) {
            const parts = lowerDesc.split(/result in|leads to|causing/i);
            event = parts[0].trim();
            impact = parts[1].split('.')[0].trim();
        }

        const cleanInput = (text, prefix) => {
            if (!text) return "";
            let clean = text.trim();
            // Remove prefix if exists
            if (prefix && clean.toLowerCase().startsWith(prefix.toLowerCase())) {
                clean = clean.substring(prefix.length).trim();
            }
            // Remove common redundant starters
            const starters = ['failure in', 'potential failure in', 'risk of'];
            for (const s of starters) {
                if (clean.toLowerCase().startsWith(s)) {
                    clean = clean.substring(s.length).trim();
                }
            }
            return clean.charAt(0).toUpperCase() + clean.slice(1);
        };

        const rephrased = strictArticulate(event, cause, impact, effectiveRequirement);

        if (rephrased === "WEAK_GENERATION") {
            descAnalysis = {
                valid: false,
                interpretation_failed: true,
                status: "WEAK_GENERATION",
                issues: ["Could not generate a professional two-sentence risk description."],
                original: rd
            };
        } else if (rd.trim().length < 15 || !hasContext || !hasImpact) {
            descAnalysis = {
                valid: false,
                interpretation_failed: false,
                rephrased,
                articulation: {
                    event: event.charAt(0).toUpperCase() + event.slice(1),
                    cause: cause.charAt(0).toUpperCase() + cause.slice(1),
                    impact: impact.charAt(0).toUpperCase() + impact.slice(1)
                },
                original: rd
            };
        } else {
            const fmea = strictFMEA(event, cause, impact);
            descAnalysis = {
                valid: true,
                interpretation_failed: false,
                rephrased,
                failure_mode: fmea.mode,
                effects: fmea.effects,
                causes: fmea.causes
            };
        }
    }

    // 3. Scoring
    let severity = 3;
    let occurrence = 2;
    let detection = 3;

    const lowerContext = ((risk_description || "") + " " + (effectiveRequirement || "")).toLowerCase();
    if (/critical|severe|catastrophic|legal|regulatory|fines|breach|security|safety|fatal/i.test(lowerContext)) severity = 5;
    else if (/major|significant|loss|halt|customer|quality|financial/i.test(lowerContext)) severity = 4;

    if (/frequent|often|daily|regularly|always|continually/i.test(lowerContext)) occurrence = 4;
    else if (/occasionally|sometimes|periodic|monthly/i.test(lowerContext)) occurrence = 3;

    if (/hidden|unknown|unmonitored|none|unavailable|invisible/i.test(lowerContext)) detection = 4;
    else if (/manual|periodic|sample|check-based/i.test(lowerContext)) detection = 3;

    const analysisJustification = {
        severity: severity >= 4 ? "Significant impact affecting business continuity or regulatory compliance." : "Moderate operational disruption with localized scope.",
        occurrence: occurrence >= 3 ? "Recurrent or periodic occurrence based on process exposure." : "Rare occurrence in a stable or mature process environment.",
        detection: detection >= 3 ? "Manual detection during periodic reviews or unmonitored process." : "Automated real-time monitoring and alert systems in place."
    };

    res.json({
        valid: reqAnalysis.valid && descAnalysis.valid,
        reqAnalysis,
        descAnalysis,
        scores: {
            severity,
            occurrence,
            detection
        },
        justification: analysisJustification
    });
};

/**
 * Department overview generation
 */
const generateDepartmentOverview = (departmentId, departmentName) => {
    const overviews = {
        'HR': 'Human Resources manages employee hiring, compliance, performance, and workforce well-being while addressing people-related and policy risks.',
        'Finance': 'Finance oversees budgeting, financial controls, reporting, and cash flow while managing financial, audit, and regulatory risks.',
        'IT': 'IT ensures secure and reliable systems, data protection, and technology operations while mitigating cyber and infrastructure risks.',
        'Operations': 'Operations manages day-to-day business processes, efficiency, and continuity while controlling operational and safety risks.',
        'Sales': 'Sales focuses on revenue generation, customer relationships, and market growth while managing pricing, contract, and credit risks.'
    };
    return overviews[departmentName] || `${departmentName} department manages specialized functions and processes while identifying and mitigating department-specific risks to ensure operational excellence.`;
};

const getDepartmentOverview = async (req, res) => {
    const { id } = req.params;
    const db = getDb();
    try {
        const department = await new Promise((resolve, reject) => {
            db.get("SELECT id, name FROM departments WHERE id = ?", [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!department) return res.status(404).json({ error: "Department not found" });

        const overview = generateDepartmentOverview(department.id, department.name);
        res.json({
            department_id: department.id,
            department_name: department.name,
            overview: overview,
            generated_at: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        db.close();
    }
};

const getAIOverview = async (req, res) => {
    const { department_id, department_name } = req.body;
    if (!department_id) return res.status(400).json({ error: "department_id is required" });

    let deptName = department_name;
    if (!deptName) {
        const db = getDb();
        try {
            const department = await new Promise((resolve, reject) => {
                db.get("SELECT name FROM departments WHERE id = ?", [department_id], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
            deptName = department?.name;
        } finally {
            db.close();
        }
    }

    const overview = generateDepartmentOverview(department_id, deptName);
    res.json({
        overview: overview,
        department_id: department_id,
        department_name: deptName
    });
};

module.exports = {
    generateRisk,
    articulateRisk,
    validateRequirement,
    validateDescription,
    validateScoring,
    analyzeRisk,
    logAIAction,
    getDepartmentOverview,
    getAIOverview
};
