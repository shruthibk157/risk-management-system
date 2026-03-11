import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { risksAPI, dashboardAPI, aiAPI } from '../services/api';
import {
  Shield, Save, ArrowLeft, FileText,
  Sparkles, ChevronRight, ChevronLeft,
  CheckCircle2, RefreshCw, AlertTriangle,
  Check, ChevronDown, ChevronUp, MoreHorizontal, Edit
} from 'lucide-react';

const RiskForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedDepartment, user } = useAuth();
  const isEdit = !!id;
  const isSinglePage = location.pathname.includes('/view');

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  // Stepper State
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [magicLoading, setMagicLoading] = useState({});
  const [dateManuallySet, setDateManuallySet] = useState(false);
  const [showAnalysisPopup, setShowAnalysisPopup] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [isRiskValidated, setIsRiskValidated] = useState(false);
  const [isRequirementValidated, setIsRequirementValidated] = useState(false);
  const [showSODPopup, setShowSODPopup] = useState(false);
  const [sodData, setSodData] = useState(null);
  const [showArticulationModal, setShowArticulationModal] = useState(false);
  const [articulationData, setArticulationData] = useState(null);
  const [showJustification, setShowJustification] = useState(false);
  const [aiJustification, setAiJustification] = useState(null);
  const [scoreAdvisory, setScoreAdvisory] = useState({});

  const [formData, setFormData] = useState({
    sl_no: 'AUTO',
    date_raised: new Date().toISOString().split('T')[0],
    department_id: '',
    requirement_process_area: '',
    risk_description: '',
    potential_failure_mode: '',
    potential_effects: '',
    severity: '',
    potential_causes: '',
    current_controls_prevention: '',
    occurrence: '',
    current_controls_detection: '',
    detection: '',
    rpn: 0,
    risk_classification: 'Acceptable (A)',
    recommended_actions: '',
    responsibility_owner: '',
    target_completion_date: '',
    actions_taken: '',
    actual_completion_date: '',
    severity_after: '',
    occurrence_after: '',
    detection_after: '',
    residual_rpn: 0,
    review_date: '',
    status: 'Open',
    is_ai_assisted: 0
  });

  const steps = [
    { number: 1, label: 'Identification' },
    { number: 2, label: 'Controls' },
    { number: 3, label: 'Results & Review' }
  ];



  const calculateRPN = (s, o, d) => (parseInt(s) || 0) * (parseInt(o) || 0) * (parseInt(d) || 0);

  const getRPNData = (rpn) => {
    if (rpn <= 25) return { color: 'green', label: 'Acceptable' };
    if (rpn <= 75) return { color: 'yellow', label: 'Moderate' };
    return { color: 'red', label: 'Significant' };
  };

  useEffect(() => {
    fetchDepartments();
    if (isEdit) {
      fetchRisk();
    }
  }, [id, isEdit]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!isEdit && !isSinglePage) {
        localStorage.setItem('risk_form_draft', JSON.stringify(formData));
        setLastSaved(new Date());
      }
      if (isEdit && id) {
        try {
          await risksAPI.update(id, formData);
          setLastSaved(new Date());
        } catch (error) {
          console.error('Autosave failed:', error);
        }
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [formData, isEdit, isSinglePage, id]);

  useEffect(() => {
    if (!isEdit && !formData.department_id) {
      if (selectedDepartment) {
        setFormData(prev => ({ ...prev, department_id: selectedDepartment }));
      } else if (user?.department_id) {
        setFormData(prev => ({ ...prev, department_id: user.department_id }));
      }
    }
  }, [selectedDepartment, user, isEdit, formData.department_id]);

  // Fetch Next Global Risk ID (New)
  useEffect(() => {
    if (!id && !formData.risk_id) { // Only for new risks and if not already set
      const fetchNextId = async () => {
        try {
          const res = await risksAPI.getNextId();
          if (res.data && res.data.next_risk_id) {
            setFormData(prev => ({ ...prev, risk_id: res.data.next_risk_id }));
          }
        } catch (error) {
          console.error("Error fetching next risk ID", error);
        }
      };
      fetchNextId();
    }
  }, [id]);

  useEffect(() => {
    const rpn = calculateRPN(formData.severity, formData.occurrence, formData.detection);
    const classification = rpn >= 25 ? 'Significant (S)' : 'Acceptable (A)';

    const residual_rpn = calculateRPN(formData.severity_after, formData.occurrence_after, formData.detection_after);
    const residual_classification = residual_rpn >= 25 ? 'Significant (S)' : 'Acceptable (A)';

    setFormData(prev => ({
      ...prev,
      rpn,
      risk_classification: classification,
      residual_rpn,
      residual_classification
    }));
  }, [formData.severity, formData.occurrence, formData.detection, formData.severity_after, formData.occurrence_after, formData.detection_after]);

  // Pre-fetch the NEXT sequential number for display
  useEffect(() => {
    const fetchNextSlNo = async () => {
      const deptId = formData.department_id || selectedDepartment || user?.department_id;
      if (!isEdit && deptId && (!formData.sl_no || formData.sl_no === 'AUTO')) {
        try {
          const response = await risksAPI.getNextSlNo(deptId);
          if (response.data && response.data.next_sl_no) {
            setFormData(prev => ({ ...prev, sl_no: response.data.next_sl_no }));
          }
        } catch (error) {
          console.error('Failed to fetch next SL No:', error);
        }
      }
    };
    fetchNextSlNo();
  }, [isEdit, formData.department_id, selectedDepartment, user]);

  const fetchDepartments = async () => {
    try {
      const response = await dashboardAPI.getDepartments();
      setDepartments(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const fetchRisk = async () => {
    setLoading(true);
    try {
      const response = await risksAPI.getById(id);
      setFormData(response.data);
    } catch (error) {
      console.error('Failed to fetch risk:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    if (!e || !e.target) return;
    const { name, value } = e.target;
    if (name === 'date_raised' && value) setDateManuallySet(true);

    if (['severity', 'occurrence', 'detection', 'severity_after', 'occurrence_after', 'detection_after'].includes(name)) {
      if (value === '') {
        setFormData(prev => ({ ...prev, [name]: '' }));
        setErrors(prev => ({ ...prev, [name]: null }));
        return;
      }

      const sanitizedValue = value.slice(0, 1);
      const num = parseInt(sanitizedValue);
      if (isNaN(num)) return;

      if (num < 1 || num > 5) {
        setErrors(prev => ({ ...prev, [name]: '1-5' }));
        return; // Strict: do not update state
      } else {
        setErrors(prev => ({ ...prev, [name]: null }));
        setFormData(prev => ({ ...prev, [name]: num }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
      if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
      if (name === 'requirement_process_area') setIsRequirementValidated(false);
      if (name === 'risk_description') setIsRiskValidated(false);

      if (['severity', 'occurrence', 'detection'].includes(name)) {
        handleManualScoreChange(name, value);
      }
    }
  };



  const handleMagicAction = async (field, promptMode) => {
    if (!formData.department_id) {
      alert('Please select a department first.');
      return;
    }

    // ISO Gate: No scoring/re-articulation without valid description
    if (field === 'risk_description' && !formData.risk_description) {
      alert('Please enter a risk description first.');
      return;
    }

    setMagicLoading(prev => ({ ...prev, [field]: true }));
    try {
      const fd = new FormData();
      fd.append('department_id', formData.department_id);
      fd.append('risk_description', formData.risk_description);
      fd.append('requirement', formData.requirement_process_area);

      let context = '';
      if (promptMode === 'REPHRASE') {
        if (field === 'actions_taken') context = `[REPHRASE_MODE] [RESULTS_MODE] ${formData[field] || ''}`;
        else if (field === 'recommended_actions') context = `[REPHRASE_MODE] [RECOM_MODE] ${formData[field] || ''}`;
        else context = `[REPHRASE_MODE] ${formData[field] || ''}`;
      } else if (promptMode === 'SUGGEST_CONTROLS') {
        context = `[SUGGEST_CONTROLS] Risk: ${formData.risk_description}`;
      }
      fd.append('context_text', context);
      const response = await aiAPI.articulateRisk(fd);

      if (field === 'risk_description' && response.data.articulation) {
        setArticulationData({
          original: formData.risk_description,
          articulated: response.data.articulation,
          full_text: response.data.rephrased,
          scores: response.data.scores,
          justification: response.data.justification
        });
        setShowArticulationModal(true);
        return;
      }

      if (response.data[field]) setFormData(prev => ({ ...prev, [field]: response.data[field] }));
      else if (response.data.rephrased) setFormData(prev => ({ ...prev, [field]: response.data.rephrased }));
      else if (response.data.text) setFormData(prev => ({ ...prev, [field]: response.data.text }));
    } catch (error) {
      console.error("Magic action failed", error);
    } finally {
      setMagicLoading(prev => ({ ...prev, [field]: false }));
    }
  };

  const handleAnalyzeRisk = async () => {
    if (!formData.department_id) {
      alert('Please select a department first.');
      return;
    }
    setMagicLoading(prev => ({ ...prev, analyzeRisk: true }));
    try {
      const response = await aiAPI.analyzeRisk({
        requirement_text: formData.requirement_process_area,
        risk_description: formData.risk_description,
        department_id: formData.department_id
      });

      const res = response.data;
      if (res.both_valid) {
        setIsRequirementValidated(true);
        setIsRiskValidated(true);
      } else {
        setAnalysisData(res);
        setShowAnalysisPopup(true);
      }
    } catch (error) {
      console.error("Risk analysis failed", error);
      alert('Failed to analyze risk. Please try again.');
    } finally {
      setMagicLoading(prev => ({ ...prev, analyzeRisk: false }));
    }
  };

  const handleMagicPrompt = async () => {
    if (!formData.department_id) {
      alert('Please select a department first.');
      return;
    }
    setMagicLoading(prev => ({ ...prev, magicPrompt: true }));
    try {
      const response = await aiAPI.generateRisk({ department_id: formData.department_id });
      setFormData(prev => ({ ...prev, ...response.data, is_ai_assisted: 1 }));
      alert('✨ Risk context generated from department knowledge base!');
    } catch (error) {
      console.error("Magic Prompt failed", error);
      if (error.response && error.response.data && error.response.data.error) {
        alert(error.response.data.error);
      } else {
        alert('Failed to generate risk. Please ensure department documents are uploaded.');
      }
    } finally {
      setMagicLoading(prev => ({ ...prev, magicPrompt: false }));
    }
  };

  const logAIAction = async (actionData) => {
    try {
      await aiAPI.logAIAction({
        risk_id: id || 'NEW',
        ...actionData
      });
    } catch (err) {
      console.error("Failed to log AI action", err);
    }
  };

  const handleMagicSOD = async () => {
    if (!formData.department_id) {
      alert('Please select a department first.');
      return;
    }
    setMagicLoading(prev => ({ ...prev, magicSOD: true }));
    try {
      const response = await aiAPI.validateScoring({
        department_id: formData.department_id,
        requirement_process_area: formData.requirement_process_area,
        risk_description: formData.risk_description,
        severity: formData.severity,
        occurrence: formData.occurrence,
        detection: formData.detection
      });
      setSodData(response.data);
      setShowSODPopup(true);

      // Also update justifications for display
      setAiJustification(response.data);
    } catch (error) {
      console.error("SOD Magic failed", error);
      alert('Failed to generate SOD suggestions.');
    } finally {
      setMagicLoading(prev => ({ ...prev, magicSOD: false }));
    }
  };

  const handleManualScoreChange = async (name, value) => {
    // Background validation
    if (formData.risk_description && formData.requirement_process_area) {
      try {
        const res = await aiAPI.validateScoring({
          department_id: formData.department_id,
          requirement_process_area: formData.requirement_process_area,
          risk_description: formData.risk_description,
          [name]: value
        });
        const field = name.split('_')[0]; // e.g., 'severity'
        if (res.data[field] && res.data[field].user_mismatch) {
          setScoreAdvisory(prev => ({ ...prev, [field]: res.data[field] }));
        } else {
          setScoreAdvisory(prev => ({ ...prev, [field]: null }));
        }
      } catch (e) { console.error(e); }
    }
  };

  const validateStep = (step) => {
    const newErrors = {};
    const requiredFields = {
      1: ['requirement_process_area', 'risk_description', 'severity', 'occurrence', 'detection', 'potential_failure_mode', 'potential_effects', 'potential_causes'],
      2: ['current_controls_prevention', 'current_controls_detection', 'recommended_actions', 'responsibility_owner', 'target_completion_date'],
      3: ['actions_taken', 'actual_completion_date', 'review_date', 'status', 'severity_after', 'occurrence_after', 'detection_after']
    };

    // Special check for department_id if admin and not pre-selected
    if (step === 1 && user?.role === 'admin' && !selectedDepartment) {
      if (!requiredFields[1].includes('department_id')) {
        requiredFields[1].push('department_id');
      }
    }

    const fieldsToValidate = requiredFields[step] || [];
    let firstInvalidField = null;

    fieldsToValidate.forEach(field => {
      const val = formData[field];
      if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '') || (typeof val === 'number' && isNaN(val))) {
        newErrors[field] = '⚠ This field is required.';
        if (!firstInvalidField) firstInvalidField = field;
      }
    });

    setErrors(prev => ({ ...prev, ...newErrors }));

    if (firstInvalidField) {
      // Small delay to ensure state update has triggered re-render with error classes
      setTimeout(() => {
        const element = document.getElementsByName(firstInvalidField)[0] ||
          document.querySelector(`[name="${firstInvalidField}"]`) ||
          document.getElementById(firstInvalidField);

        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.focus({ preventScroll: true }); // preventScroll because we already scrolled smoothly
        }
      }, 100);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (submitting) return;

    if (!validateStep(currentStep)) return;

    if (currentStep < 3) {
      nextStep();
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) await risksAPI.update(id, formData);
      else await risksAPI.create(formData);
      localStorage.removeItem('risk_form_draft');
      navigate('/risks');
    } catch (error) {
      console.error('Submit failed:', error);
      alert('Failed to save risk');
    } finally {
      setSubmitting(false);
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));



  const renderNumericInput = (name, value, label) => (
    <div className="compact-field-group relative-group">
      <label>{label}</label>
      <input
        type="number"
        min="1"
        max="5"
        name={name}
        value={value}
        onChange={handleChange}
        placeholder="1-5"
        className={errors[name] ? 'error' : ''}
      />
      {errors[name] && <span className="field-error-msg text-center" style={{ fontSize: '10px' }}>{errors[name]}</span>}
    </div>
  );

  const SmartAssistButton = ({ onClick, loading }) => (
    <button type="button" className="btn-smart-icon" onClick={onClick} disabled={loading} title="AI Assist">
      {loading ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
    </button>
  );

  if (loading) return <div className="loading-state"><RefreshCw className="animate-spin" /> Loading...</div>;

  return (
    <div className="risk-page-container">
      {/* Header */}
      <header className="risk-header">
        <div className="header-left">
          <button onClick={() => navigate('/risks')} className="back-btn"><ArrowLeft size={16} /></button>
          <div className="header-titles">
            <h1>{isSinglePage ? 'Risk Details' : (isEdit ? 'Update Risk' : 'New Risk Assessment')}</h1>
            <span className="sub-header-info">
              {formData.sl_no} • {formData.date_raised ? new Date(formData.date_raised).toLocaleDateString() : 'No Date'}
            </span>
          </div>
        </div>
        <div className="header-actions">
          {lastSaved && <span className="save-status"><CheckCircle2 size={12} /> Auto-saved</span>}
        </div>
      </header>

      {/* Stepper Progress (Hidden in View Mode) */}
      {!isSinglePage && (
        <div className="stepper-wrapper">
          {steps.map((step, index) => (
            <div key={step.number}
              className={`step-item ${currentStep === step.number ? 'active' : ''} ${currentStep > step.number ? 'completed' : ''}`}
              onClick={() => {
                if (step.number > currentStep) {
                  if (validateStep(currentStep)) {
                    setCurrentStep(step.number);
                  }
                } else {
                  setCurrentStep(step.number);
                }
              }}>
              <div className="step-indicator">
                {currentStep > step.number ? <Check size={14} /> : step.number}
              </div>
              <span className="step-label">{step.label}</span>
              {index < steps.length - 1 && <div className="step-line" />}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="main-form">
        <fieldset disabled={isSinglePage} style={{ border: 'none', padding: 0, margin: 0 }}>

          {/* SECTION 1: RISK INFORMATION */}
          {(isSinglePage || currentStep === 1) && (
            <section className="form-section animate-fade-in">
              <div className="section-header-row">
                <h3 className="section-title dynamic-title">
                  {formData.sl_no && formData.sl_no !== 'AUTO' ? `${formData.sl_no}. ` : ''}Risk Information
                </h3>
                <div className="header-date-group">
                  <label>Date:</label>
                  <input
                    type="date"
                    name="date_raised"
                    value={formData.date_raised}
                    onChange={handleChange}
                    readOnly={isEdit || dateManuallySet}
                    className={`input-compact-date ${(isEdit || dateManuallySet) ? 'frozen' : ''}`}
                  />
                </div>
              </div>

              <div className="compact-grid">

                {/* Conditional Department (Admin Only) */}
                {user?.role === 'admin' && !selectedDepartment && (
                  <div className="field-group">
                    <label>Department</label>
                    <select name="department_id" value={formData.department_id} onChange={handleChange} className={`input-sm ${errors.department_id ? 'error' : ''}`}>
                      <option value="">Select Dept</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    {errors.department_id && <span className="field-error-msg">{errors.department_id}</span>}
                  </div>
                )}

                {/* 1. Requirement / Process Area */}
                <div className="field-group">
                  <label>Requirement / Process Area</label>
                  <input
                    name="requirement_process_area"
                    value={formData.requirement_process_area}
                    onChange={handleChange}
                    className={`input-sm ${errors.requirement_process_area ? 'error' : ''}`}
                    placeholder="e.g. Manufacturing Process"
                  />
                  {errors.requirement_process_area && <span className="field-error-msg">{errors.requirement_process_area}</span>}
                  {isRequirementValidated && <div className="text-success mt-1 text-xs flex items-center gap-1"><CheckCircle2 size={12} /> Requirement validated.</div>}
                </div>

                {/* 2. Risk Description */}
                <div className="field-group relative-group">
                  <div className="label-row">
                    <label>Risk Description</label>
                  </div>
                  <textarea
                    name="risk_description"
                    id="risk_description"
                    value={formData.risk_description}
                    onChange={handleChange}
                    className={`textarea-sm medium-height ${errors.risk_description ? 'error' : ''}`}
                    placeholder="Describe the risk..."
                  />
                  {errors.risk_description && <span className="field-error-msg">{errors.risk_description}</span>}
                  {!isSinglePage && <SmartAssistButton onClick={handleAnalyzeRisk} loading={magicLoading.analyzeRisk} />}
                  {isRiskValidated && <div className="text-success mt-1 text-xs flex items-center gap-1"><CheckCircle2 size={12} /> Risk Description professionally structured.</div>}
                </div>

                {/* 3. SOD + RPN (Compact Row) */}
                <div className={`sod-rpn-row ${!formData.risk_description ? 'locked-gate' : ''}`}>
                  {!formData.risk_description && (
                    <div className="gate-overlay" onClick={() => document.getElementById('risk_description').focus()}>
                      <AlertTriangle size={14} /> Description Required for Scoring
                    </div>
                  )}
                  <div className="sod-group relative-group">
                    <div className="sod-item">
                      <label>Severity</label>
                      <input
                        type="number"
                        name="severity"
                        value={formData.severity}
                        onChange={handleChange}
                        disabled={!formData.risk_description}
                        onKeyDown={(e) => {
                          if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        placeholder="-"
                        className={errors.severity ? 'error' : ''}
                      />
                      {errors.severity && <span className="field-error-msg">{errors.severity}</span>}
                      {scoreAdvisory.severity && (
                        <div className="score-advisory-pop">
                          <span>Rec: {scoreAdvisory.severity.value}</span>
                          <button type="button" onClick={() => {
                            setFormData(prev => ({ ...prev, severity: scoreAdvisory.severity.value }));
                            setScoreAdvisory(prev => ({ ...prev, severity: null }));
                            logAIAction({ action_type: 'SCORE_ADVISORY_ACCEPT', field: 'severity', value: scoreAdvisory.severity.value });
                          }}>Apply</button>
                        </div>
                      )}
                    </div>
                    <div className="sod-item">
                      <label>Occurrence</label>
                      <input
                        type="number"
                        name="occurrence"
                        value={formData.occurrence}
                        onChange={handleChange}
                        disabled={!formData.risk_description}
                        onKeyDown={(e) => {
                          if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        placeholder="-"
                        className={errors.occurrence ? 'error' : ''}
                      />
                      {errors.occurrence && <span className="field-error-msg">{errors.occurrence}</span>}
                      {scoreAdvisory.occurrence && (
                        <div className="score-advisory-pop">
                          <span>Rec: {scoreAdvisory.occurrence.value}</span>
                          <button type="button" onClick={() => {
                            setFormData(prev => ({ ...prev, occurrence: scoreAdvisory.occurrence.value }));
                            setScoreAdvisory(prev => ({ ...prev, occurrence: null }));
                            logAIAction({ action_type: 'SCORE_ADVISORY_ACCEPT', field: 'occurrence', value: scoreAdvisory.occurrence.value });
                          }}>Apply</button>
                        </div>
                      )}
                    </div>
                    <div className="sod-item">
                      <label>Detection</label>
                      <input
                        type="number"
                        name="detection"
                        value={formData.detection}
                        onChange={handleChange}
                        disabled={!formData.risk_description}
                        onKeyDown={(e) => {
                          if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        placeholder="-"
                        className={errors.detection ? 'error' : ''}
                      />
                      {errors.detection && <span className="field-error-msg">{errors.detection}</span>}
                      {scoreAdvisory.detection && (
                        <div className="score-advisory-pop">
                          <span>Rec: {scoreAdvisory.detection.value}</span>
                          <button type="button" onClick={() => {
                            setFormData(prev => ({ ...prev, detection: scoreAdvisory.detection.value }));
                            setScoreAdvisory(prev => ({ ...prev, detection: null }));
                            logAIAction({ action_type: 'SCORE_ADVISORY_ACCEPT', field: 'detection', value: scoreAdvisory.detection.value });
                          }}>Apply</button>
                        </div>
                      )}
                    </div>
                    {/* Smart Assist Button for SOD */}
                    <div className="magic-button-container">
                      <SmartAssistButton onClick={handleMagicSOD} loading={magicLoading.magicSOD} />
                    </div>
                  </div> {/* Close sod-group */}

                  {/* RPN Display Logic */}
                  {(() => {
                    const isVisible = formData.severity || formData.occurrence || formData.detection;
                    return (
                      <>
                        <div className={`rpn-arrow ${isVisible ? 'visible' : ''}`}>→</div>
                        <div className={`rpn-display-box ${getRPNData(formData.rpn).color} ${isVisible ? 'visible' : ''}`}>
                          <span className="rpn-label">RPN:</span>
                          <span className="rpn-value">{formData.rpn}</span>
                        </div>
                      </>
                    );
                  })()}
                </div> {/* Close sod-rpn-row */}

                {/* Justification Panel */}
                {aiJustification && (
                  <div className="justification-panel animate-slide-up">
                    <div className="panel-header" onClick={() => setShowJustification(!showJustification)}>
                      <div className="flex items-center gap-2">
                        <Shield size={14} className="text-blue-500" />
                        <span>AI Scoring Justification & Audit Trail</span>
                      </div>
                      {showJustification ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                    {showJustification && (
                      <div className="panel-body">
                        <div className="justification-grid">
                          <div className="just-item">
                            <label>Severity</label>
                            <p>{aiJustification.severity.justification}</p>
                          </div>
                          <div className="just-item">
                            <label>Occurrence</label>
                            <p>{aiJustification.occurrence.justification}</p>
                          </div>
                          <div className="just-item">
                            <label>Detection</label>
                            <p>{aiJustification.detection.justification}</p>
                          </div>
                        </div>
                        <div className="audit-note">
                          <CheckCircle2 size={10} /> ISO 9001:2015 Audit-Ready Documentation Generated
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Potential Failure Mode */}
                <div className="field-group">
                  <label>Potential Failure Mode</label>
                  <textarea
                    name="potential_failure_mode"
                    value={formData.potential_failure_mode}
                    onChange={handleChange}
                    className={`textarea-sm short-height ${errors.potential_failure_mode ? 'error' : ''}`}
                    placeholder="What could go wrong?"
                  />
                  {errors.potential_failure_mode && <span className="field-error-msg">{errors.potential_failure_mode}</span>}
                </div>

                {/* 5. Potential Effects */}
                <div className="field-group">
                  <label>Potential Effects</label>
                  <textarea
                    name="potential_effects"
                    value={formData.potential_effects}
                    onChange={handleChange}
                    className={`textarea-sm short-height ${errors.potential_effects ? 'error' : ''}`}
                    placeholder="What is the impact?"
                  />
                  {errors.potential_effects && <span className="field-error-msg">{errors.potential_effects}</span>}
                </div>

                {/* 6. Potential Causes */}
                <div className="field-group">
                  <label>Potential Causes</label>
                  <textarea
                    name="potential_causes"
                    value={formData.potential_causes}
                    onChange={handleChange}
                    className={`textarea-sm short-height ${errors.potential_causes ? 'error' : ''}`}
                    placeholder="Why would it happen?"
                  />
                  {errors.potential_causes && <span className="field-error-msg">{errors.potential_causes}</span>}
                </div>

              </div>
            </section>
          )}

          {/* SECTION 2: CONTROLS & ACTIONS */}
          {(isSinglePage || currentStep === 2) && (
            <section className="form-section animate-fade-in">
              <h3 className="section-title">2. Controls & Actions</h3>

              <div className="step-2-layout">
                {/* LEFT PANEL: CONTEXT REFERENCE */}
                <div className="left-panel">
                  <div className="risk-context-panel vertical-panel">
                    <div className="context-header">
                      <span className="context-title">Risk Context (Reference)</span>
                    </div>
                    <div className="context-grid vertical-grid">
                      <div className="context-item">
                        <label>Requirement</label>
                        <p className="truncate-multi" title={formData.requirement_process_area}>{formData.requirement_process_area || '-'}</p>
                      </div>
                      <div className="context-item">
                        <label>Risk Description</label>
                        <p className="truncate-multi" title={formData.risk_description}>{formData.risk_description || '-'}</p>
                      </div>
                      <div className="context-item">
                        <label>Failure Mode</label>
                        <p className="truncate" title={formData.potential_failure_mode}>{formData.potential_failure_mode || '-'}</p>
                      </div>
                      <div className="context-item">
                        <label>Effects</label>
                        <p className="truncate" title={formData.potential_effects}>{formData.potential_effects || '-'}</p>
                      </div>
                      <div className="context-item">
                        <label>Causes</label>
                        <p className="truncate" title={formData.potential_causes}>{formData.potential_causes || '-'}</p>
                      </div>

                      {/* Simplified Initial Risk Rating (RPN Only) */}
                      <div className="context-item">
                        <label>Initial Risk Rating</label>
                        <div className={`rpn-badge-compact ${getRPNData(formData.rpn).color} mt-1 inline-block`}>
                          RPN: {formData.rpn}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT PANEL: CONTROLS FORM */}
                <div className="right-panel">
                  <div className="compact-grid">
                    <div className="grid-row cols-2">
                      <div className="field-group relative-group">
                        <label>Prevention Controls</label>
                        <textarea
                          name="current_controls_prevention"
                          value={formData.current_controls_prevention}
                          onChange={handleChange}
                          className={`textarea-sm medium-height ${errors.current_controls_prevention ? 'error' : ''}`}
                          rows={5}
                        />
                        {errors.current_controls_prevention && <span className="field-error-msg">{errors.current_controls_prevention}</span>}
                        <SmartAssistButton onClick={() => handleMagicAction('current_controls_prevention', 'SUGGEST_CONTROLS')} loading={magicLoading.current_controls_prevention} />
                      </div>
                      <div className="field-group relative-group">
                        <label>Detection Controls</label>
                        <textarea
                          name="current_controls_detection"
                          value={formData.current_controls_detection}
                          onChange={handleChange}
                          className={`textarea-sm medium-height ${errors.current_controls_detection ? 'error' : ''}`}
                          rows={5}
                        />
                        {errors.current_controls_detection && <span className="field-error-msg">{errors.current_controls_detection}</span>}
                        <SmartAssistButton onClick={() => handleMagicAction('current_controls_detection', 'SUGGEST_CONTROLS')} loading={magicLoading.current_controls_detection} />
                      </div>
                    </div>

                    <div className="field-group relative-group">
                      <label>Recommended Actions</label>
                      <textarea name="recommended_actions" value={formData.recommended_actions} onChange={handleChange} className={`textarea-sm short-height ${errors.recommended_actions ? 'error' : ''}`} />
                      {errors.recommended_actions && <span className="field-error-msg">{errors.recommended_actions}</span>}
                      <SmartAssistButton onClick={() => handleMagicAction('recommended_actions', 'REPHRASE')} loading={magicLoading.recommended_actions} />
                    </div>

                    <div className="grid-row cols-2">
                      <div className="field-group">
                        <label>Responsibility Owner</label>
                        <input name="responsibility_owner" value={formData.responsibility_owner} onChange={handleChange} className={`input-sm ${errors.responsibility_owner ? 'error' : ''}`} />
                        {errors.responsibility_owner && <span className="field-error-msg">{errors.responsibility_owner}</span>}
                      </div>
                      <div className="field-group">
                        <label>Target Date</label>
                        <input type="date" name="target_completion_date" value={formData.target_completion_date} onChange={handleChange} className={`input-sm ${errors.target_completion_date ? 'error' : ''}`} />
                        {errors.target_completion_date && <span className="field-error-msg">{errors.target_completion_date}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* SECTION 3: REVIEW & CLOSURE */}
          {(isSinglePage || currentStep === 3) && (
            <section className="form-section animate-fade-in">
              <h3 className="section-title">3. Review & Closure</h3>

              <div className="step-3-layout">
                {/* LEFT PANEL: RISK SUMMARY (READ-ONLY) */}
                <div className="left-summary-panel">
                  <div className="summary-card">
                    <div className="summary-card-header">
                      <span>RISK SUMMARY (FINAL REVIEW)</span>
                    </div>

                    <div className="summary-content custom-scrollbar">
                      {/* ID & Desc */}
                      <div className="summary-group">
                        <label>Risk ID</label>
                        <p>{formData.risk_id || 'NEW'}</p>
                      </div>
                      <div className="summary-group">
                        <label>Description</label>
                        <p className="truncate-lines-2">{formData.risk_description || '-'}</p>
                      </div>

                      {/* Analysis */}
                      <div className="summary-row">
                        <div className="summary-group">
                          <label>Failure Mode</label>
                          <p className="truncate-lines-2">{formData.potential_failure_mode || '-'}</p>
                        </div>
                      </div>
                      <div className="summary-group">
                        <label>Effects</label>
                        <p className="truncate-lines-1">{formData.potential_effects || '-'}</p>
                      </div>
                      <div className="summary-group">
                        <label>Causes</label>
                        <p className="truncate-lines-1">{formData.potential_causes || '-'}</p>
                      </div>

                      {/* Initial Assessment Compact */}
                      {/* Initial Assessment Compact (RPN Only) */}
                      <div className="summary-metrics">
                        <div className={`rpn-badge-compact ${getRPNData(formData.rpn).color} inline-block`}>
                          RPN: {formData.rpn}
                        </div>
                      </div>

                      <div className="summary-divider" />

                      {/* Controls */}
                      <div className="summary-group">
                        <label>Prevention Controls</label>
                        <p className="truncate-lines-2">{formData.current_controls_prevention || '-'}</p>
                      </div>
                      <div className="summary-group">
                        <label>Detection Controls</label>
                        <p className="truncate-lines-2">{formData.current_controls_detection || '-'}</p>
                      </div>

                      <div className="summary-row">
                        <div className="summary-group">
                          <label>Owner</label>
                          <p>{formData.responsibility_owner || '-'}</p>
                        </div>
                        <div className="summary-group">
                          <label>Target Date</label>
                          <p>{formData.target_completion_date || '-'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT PANEL: REVIEW FORM */}
                <div className="right-review-panel">
                  <div className="compact-grid">



                    {/* Row 1: Actions Taken (Full Width) */}
                    <div className="field-group relative-group">
                      <label>Actions Taken</label>
                      <textarea
                        name="actions_taken"
                        value={formData.actions_taken}
                        onChange={handleChange}
                        className={`textarea-sm medium-height ${errors.actions_taken ? 'error' : ''}`}
                        rows={4}
                      />
                      {errors.actions_taken && <span className="field-error-msg">{errors.actions_taken}</span>}
                      {!isSinglePage && <SmartAssistButton onClick={() => handleMagicAction('actions_taken', 'REPHRASE')} loading={magicLoading.actions_taken} />}
                    </div>

                    {/* Row 2: Dates & Status (3 Columns) */}
                    <div className="grid-row cols-3">
                      <div className="field-group">
                        <label>Completion Date</label>
                        <input type="date" name="actual_completion_date" value={formData.actual_completion_date} onChange={handleChange} className={`input-sm ${errors.actual_completion_date ? 'error' : ''}`} />
                        {errors.actual_completion_date && <span className="field-error-msg">{errors.actual_completion_date}</span>}
                      </div>
                      <div className="field-group">
                        <label>Review Date</label>
                        <input type="date" name="review_date" value={formData.review_date} onChange={handleChange} className={`input-sm ${errors.review_date ? 'error' : ''}`} />
                        {errors.review_date && <span className="field-error-msg">{errors.review_date}</span>}
                      </div>
                      <div className="field-group">
                        <label>Status</label>
                        <select name="status" value={formData.status} onChange={handleChange} className={`input-sm status-select ${errors.status ? 'error' : ''}`}>
                          <option value="Open">Open</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Closed">Closed</option>
                          <option value="Ongoing">Ongoing</option>
                        </select>
                        {errors.status && <span className="field-error-msg">{errors.status}</span>}
                      </div>
                    </div>

                    {/* Row 3: Residual Assessment (Full Width Container) */}
                    <div className="rpn-inline-row residual-row">
                      <div className="rpn-inputs">
                        {renderNumericInput('severity_after', formData.severity_after, 'Severity')}
                        {renderNumericInput('occurrence_after', formData.occurrence_after, 'Occurrence')}
                        {renderNumericInput('detection_after', formData.detection_after, 'Detection')}
                      </div>
                      <div className="rpn-badge-container ml-auto">
                        <span className="rpn-label">Residual RPN:</span>
                        <span className="rpn-value">{formData.residual_rpn}</span>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </section>
          )}

        </fieldset>

        {/* Inline Action Bar */}
        {!isSinglePage && (
          <div className="form-actions-inline">
            <button type="button" className="btn-cancel" onClick={() => navigate('/risks')}>Cancel</button>

            <div className="flex gap-3">
              {currentStep > 1 && (
                <button type="button" className="btn-prev" onClick={prevStep}>
                  <ChevronLeft size={14} /> Previous
                </button>
              )}

              {currentStep < 3 ? (
                <button type="button" className="btn-next" onClick={nextStep}>
                  Next <ChevronRight size={14} />
                </button>
              ) : (
                <button type="submit" className="btn-save" disabled={submitting}>
                  {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                  {submitting ? 'Saving...' : 'Save Risk Assessment'}
                </button>
              )}
            </div>
          </div>
        )}

      </form>

      {/* Combined Validation Popup Modal */}
      {showAnalysisPopup && analysisData && (
        <div className="modal-overlay">
          <div className="modal-container requirement-modal">
            <h3 className="modal-title">
              {!analysisData.requirement.valid ? "Requirement Description Needs Clarification" : "Risk Description Needs Enhancement"}
            </h3>
            <div className="modal-body custom-scrollbar" style={{ maxHeight: '60vh', overflowY: 'auto' }}>

              {/* SECTION A: REQUIREMENT */}
              {!analysisData.requirement.valid && (
                <div className="mb-4">
                  <p className="modal-text">
                    The entered Requirement / Process Area does not provide enough context for proper risk articulation.
                  </p>
                  <div className="issues-box message-error">
                    <strong>Issues detected:</strong>
                    <ul className="issues-list">
                      <li>The requirement is unclear or incomplete</li>
                      <li>It does not describe a process, control, or operational activity</li>
                      <li>It cannot be used to articulate a meaningful risk</li>
                    </ul>
                  </div>

                  <div className="suggestion-box message-success">
                    <strong>AI Suggested Requirement:</strong>
                    <p>{analysisData.requirement.suggestion}</p>
                  </div>
                </div>
              )}

              {/* SECTION B: RISK DESCRIPTION */}
              {!analysisData.description.valid && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="modal-text">
                    The entered Risk Description could be improved for better severity/occurrence scoring and FMEA quantification.
                  </p>

                  <div className="issues-box message-warning" style={{ backgroundColor: '#FFFBEB', borderLeftColor: '#F59E0B' }}>
                    <strong style={{ color: '#B45309' }}>Original Description:</strong>
                    <p style={{ color: '#B45309', margin: 0 }}>{formData.risk_description || "(None)"}</p>
                  </div>

                  <div className="suggestion-box message-success mt-3">
                    <strong>AI Re-articulated Risk Description:</strong>
                    <p>{analysisData.description.rephrased || analysisData.description.example}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-actions-horizontal flex flex-wrap gap-2 justify-end" style={{ padding: '16px 24px', background: '#F8FAFC', borderTop: '1px solid #E5E7EB', flexWrap: 'wrap' }}>
              <button className="btn-secondary" onClick={() => setShowAnalysisPopup(false)}>
                Cancel
              </button>
              <button className="btn-secondary" onClick={() => setShowAnalysisPopup(false)}>
                Edit Manually
              </button>

              {/* Conditional Acceptance Buttons */}
              {!analysisData.requirement.valid && analysisData.description.valid && (
                <button className="btn-primary" onClick={() => {
                  setFormData(prev => ({ ...prev, requirement_process_area: analysisData.requirement.suggestion }));
                  setIsRequirementValidated(true);
                  setShowAnalysisPopup(false);
                }}>
                  Accept Requirement Suggestion
                </button>
              )}

              {analysisData.requirement.valid && !analysisData.description.valid && (
                <button className="btn-primary" onClick={() => {
                  setFormData(prev => ({ ...prev, risk_description: analysisData.description.rephrased || analysisData.description.example }));
                  setIsRiskValidated(true);
                  setShowAnalysisPopup(false);
                }}>
                  Accept Risk Description Suggestion
                </button>
              )}

              {!analysisData.requirement.valid && !analysisData.description.valid && (
                <button className="btn-primary" onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    requirement_process_area: analysisData.requirement.suggestion,
                    risk_description: analysisData.description.rephrased || analysisData.description.example
                  }));
                  setIsRequirementValidated(true);
                  setIsRiskValidated(true);
                  setShowAnalysisPopup(false);
                }}>
                  Accept Both
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SOD ANALYSIS POPUP */}
      {showSODPopup && sodData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1a1a1a] border border-white/10 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-900/20 to-transparent border-b border-white/5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Sparkles className="text-blue-400" size={18} />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg leading-tight">SOD Scoring Optimization</h3>
                  <p className="text-white/40 text-[10px] uppercase tracking-wider font-semibold">AI Risk Quantification</p>
                </div>
              </div>
              <div className={`px-3 py-1.5 rounded-lg border font-bold text-lg bg-black/40 ${getRPNData(sodData.severity.value * sodData.occurrence.value * sodData.detection.value).color === 'green' ? 'text-green-400 border-green-500/30' :
                getRPNData(sodData.severity.value * sodData.occurrence.value * sodData.detection.value).color === 'yellow' ? 'text-yellow-400 border-yellow-500/30' : 'text-red-400 border-red-500/30'}`}>
                RPN: {sodData.severity.value * sodData.occurrence.value * sodData.detection.value}
              </div>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* Severity */}
              <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-white/60 text-[10px] font-bold uppercase tracking-wider">Severity (S)</label>
                  <input
                    type="number"
                    min="1" max="5"
                    value={sodData.severity.value}
                    onChange={(e) => setSodData({ ...sodData, severity: { ...sodData.severity, value: parseInt(e.target.value) || 1 } })}
                    className="w-12 h-10 bg-black/40 border border-white/10 rounded-lg text-center text-blue-400 font-bold text-lg focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <p className="text-xs text-white/80 leading-relaxed italic">"{sodData.severity.justification}"</p>
              </div>

              {/* Occurrence */}
              <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-white/60 text-[10px] font-bold uppercase tracking-wider">Occurrence (O)</label>
                  <input
                    type="number"
                    min="1" max="5"
                    value={sodData.occurrence.value}
                    onChange={(e) => setSodData({ ...sodData, occurrence: { ...sodData.occurrence, value: parseInt(e.target.value) || 1 } })}
                    className="w-12 h-10 bg-black/40 border border-white/10 rounded-lg text-center text-blue-400 font-bold text-lg focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <p className="text-xs text-white/80 leading-relaxed italic">"{sodData.occurrence.justification}"</p>
              </div>

              {/* Detection */}
              <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-white/60 text-[10px] font-bold uppercase tracking-wider">Detection (D)</label>
                  <input
                    type="number"
                    min="1" max="5"
                    value={sodData.detection.value}
                    onChange={(e) => setSodData({ ...sodData, detection: { ...sodData.detection, value: parseInt(e.target.value) || 1 } })}
                    className="w-12 h-10 bg-black/40 border border-white/10 rounded-lg text-center text-blue-400 font-bold text-lg focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <p className="text-xs text-white/80 leading-relaxed italic">"{sodData.detection.justification}"</p>
              </div>
            </div>

            <div className="p-4 bg-black/20 border-t border-white/5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowSODPopup(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-white font-semibold hover:bg-white/5 transition-all text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    severity: sodData.severity.value,
                    occurrence: sodData.occurrence.value,
                    detection: sodData.detection.value
                  }));
                  setShowSODPopup(false);
                  // RPN will update automatically via useEffect
                }}
                className="flex-[1.5] px-4 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all text-xs flex items-center justify-center gap-2"
              >
                <Check size={16} /> Accept AI Scoring
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RISK ARTICULATION MODAL */}
      {showArticulationModal && articulationData && (
        <div className="modal-overlay">
          <div className="modal-container articulation-modal">
            <h3 className="modal-title">AI Risk Enhancement & Articulation</h3>
            <div className="modal-body custom-scrollbar" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <div className="articulation-structure">
                <div className="art-box">
                  <label>Risk Event</label>
                  <p>{articulationData.articulated.event}</p>
                </div>
                <div className="art-box">
                  <label>Primary Cause</label>
                  <p>{articulationData.articulated.cause}</p>
                </div>
                <div className="art-box">
                  <label>Potential Impact</label>
                  <p>{articulationData.articulated.impact}</p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <label className="text-[10px] font-bold text-blue-800 uppercase block mb-1">Full ISO-Aligned Articulation</label>
                <p className="text-sm text-blue-900 leading-relaxed font-medium">{articulationData.full_text}</p>
              </div>
            </div>
            <div className="modal-actions-horizontal">
              <button type="button" className="btn-secondary" onClick={() => {
                setShowArticulationModal(false);
                logAIAction({ action_type: 'ARTICULATION_REJECT', original: articulationData.original });
              }}>Keep Original</button>
              <button type="button" className="btn-primary" onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  risk_description: articulationData.full_text,
                  severity: articulationData.scores.severity,
                  occurrence: articulationData.scores.occurrence,
                  detection: articulationData.scores.detection,
                  is_ai_assisted: 1
                }));
                setAiJustification(articulationData.justification);
                setIsRiskValidated(true);
                setShowArticulationModal(false);
                logAIAction({
                  action_type: 'ARTICULATION_ACCEPT',
                  original: articulationData.original,
                  suggestion: articulationData.full_text,
                  scores: articulationData.scores
                });
              }}>Accept & Replace</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        :root {
          /* New Color System for Form */
          --form-page-bg: #F5F5F5;
          --form-card-bg: #FFFFFF;
          --form-card-border: #E5E7EB;
          --form-card-radius: 16px;
          --form-card-shadow: 0 4px 24px rgba(0,0,0,0.07);

          /* Input Fields */
          --input-bg: #F8FAFB;
          --input-bg-focus: #FFFFFF;
          --input-border: #E2E8F0;
          --input-border-focus: #2D6A4F;
          --input-focus-ring: rgba(45,106,79,0.12);

          /* Stepper & Action */
          --stepper-active: #2D6A4F;
          --stepper-inactive: #E5E7EB;
          --stepper-text: #1A1A2E;
          --stepper-text-muted: #6B7280;
          --btn-primary-bg: #2D6A4F;
          --btn-primary-hover: #1A4731;

          /* General (mapping to existing classes where needed) */
          --border: var(--form-card-border);
          --primary: #2D6A4F;
          --text-main: #1A1A2E;
          --text-muted: #6B7280;
          --success: #10b981;
          --danger: #E63946;
          --warning: #F59E0B;
        

        .risk-page-container {
          max-width: 900px;
          margin: 0 auto;
          color: var(--text-main);
          padding-bottom: 60px; /* Reduced from 80px */
        }

        /* HEADER */
        .risk-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        /* Helper Classes */
        .text-success { color: var(--success); }
        .text-xs { font-size: 0.75rem; }
        .flex { display: flex; }
        .items-center { align-items: center; }
        .gap-1 { gap: 0.25rem; }
        .mt-1 { margin-top: 0.25rem; }
        .mt-3 { margin-top: 0.75rem; }
        .mt-4 { margin-top: 1rem; }
        .mb-4 { margin-bottom: 1rem; }
        .pt-4 { padding-top: 1rem; }
        .border-t { border-top-width: 1px; }
        .border-gray-100 { border-color: #f3f4f6; }

        /* Requirement Validation Modal Specifics */
        .requirement-modal {
          max-width: 650px !important;
        }
        
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeIn 0.15s ease-out;
        }

        .modal-container {
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          width: 90%;
          max-width: 480px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: slideUp 0.15s ease-out;
        }

        .modal-title {
          padding: 18px 24px;
          margin: 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--text-main);
          border-bottom: 1px solid var(--border);
        }

        .modal-body {
          padding: 24px;
        }

        .modal-text {
          margin-top: 0;
          margin-bottom: 16px;
          color: var(--text-muted);
          line-height: 1.5;
        }

        .issues-box {
          background-color: #FEF2F2;
          border-left: 4px solid var(--danger);
          padding: 12px 16px;
          margin-bottom: 16px;
          border-radius: 0 4px 4px 0;
        }

        .issues-box strong {
          color: #991B1B;
          display: block;
          margin-bottom: 8px;
        }

        .issues-list {
          margin: 0;
          padding-left: 20px;
          color: #991B1B;
        }

        .issues-list li {
          margin-bottom: 4px;
        }

        .suggestion-box {
          background-color: #ECFDF5;
          border-left: 4px solid var(--success);
          padding: 12px 16px;
          border-radius: 0 4px 4px 0;
        }

        .suggestion-box strong {
          color: #065F46;
          display: block;
          margin-bottom: 4px;
        }

        .suggestion-box p {
          color: #065F46;
          margin: 0;
        }

        .modal-actions-horizontal {
          padding: 16px 24px;
          background: #F8FAFC;
          border-top: 1px solid var(--border);
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        .risk-header-border {
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border);
        }
        .header-left { display: flex; align-items: center; gap: 1rem; }
        .back-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; }
        .back-btn:hover { color: var(--text-main); }
        .header-titles h1 { font-size: 1.25rem; font-weight: 600; margin: 0; letter-spacing: -0.02em; }
        .sub-header-info { font-size: 0.8rem; color: var(--text-muted); font-family: monospace; background: rgba(0,0,0,0.05); padding: 2px 6px; border-radius: 4px; }
        .save-status { font-size: 0.75rem; color: var(--success); display: flex; align-items: center; gap: 4px; }

        /* SECTIONS */
        .form-section {
          background: var(--form-card-bg); border-radius: var(--form-card-radius); box-shadow: var(--form-card-shadow); border: 1px solid var(--form-card-border);
          margin-bottom: 2rem;
          /* Removed card background for cleaner flat look */
        }
        .section-title {
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--primary);
          margin: 0 0 1rem 0;
          font-weight: 700;
          display: flex;
          align-items: center;
        }
        .section-title::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--border);
          margin-left: 1rem;
          opacity: 0.5;
        }

        /* GRID SYSTEM */
        .compact-grid { display: flex; flex-direction: column; gap: 16px; }
        .grid-row { display: grid; gap: 16px; align-items: start; }
        .cols-2 { grid-template-columns: 1fr 1fr; }
        .cols-3 { grid-template-columns: 1fr 1fr 1fr; }
        .grid-sub-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

        @media (max-width: 768px) {
          .cols-2, .cols-3, .grid-sub-row { grid-template-columns: 1fr; }
        }

        /* FIELDS */
        .field-group { display: flex; flex-direction: column; gap: 6px; }
        .field-group label { font-size: 0.75rem; font-weight: 600; color: var(--text-muted); }
        
        .input-sm, .textarea-sm, .status-select {
          background: var(--input-bg);
          border: 1px solid var(--input-border); border-radius: 4px;
          padding: 8px 12px;
          color: var(--text-main);
          font-size: 0.9rem;
          width: 100%;
          transition: border-color 0.2s;
        }
        
        /* Custom Top Grid */
        .top-meta-row {
          grid-template-columns: 1fr 1fr auto 1fr;
          align-items: start; /* Align to top so labels match */
        }
        @media (max-width: 768px) {
           .top-meta-row { grid-template-columns: 1fr; }
        }

        /* RPN Calculation Panel Container */
        .calculation-panel-container {
            display: flex;
            align-items: flex-end; 
            margin-bottom: 4px; /* Align with other inputs */
        }
        
        .calculation-panel {
            display: flex;
            align-items: center;
            gap: 16px; /* Gap between Inputs and Card */
            background: rgba(0,0,0,0.02);
            border: 1px solid var(--border);
            padding: 4px 12px 4px 4px;
            border-radius: 12px;
        }

        /* LEFT: Input Group */
        .rpn-input-group {
            display: flex;
            align-items: center;
            background: rgba(0,0,0,0.2);
            border-radius: 8px;
            padding: 4px;
            border: 1px solid rgba(0,0,0,0.05);
        }

        .rpn-input-group input {
            width: 50px;
            height: 48px;
            background: transparent;
            border: none;
            color: var(--text-main);
            font-size: 1.4rem;
            font-weight: 700;
            text-align: center;
            padding: 0;
        }
        .rpn-input-group input:focus { outline: none; background: rgba(0,0,0,0.05); border-radius: 4px; }
        
        .sod-label {
            font-size: 0.7rem;
            font-weight: 700;
            color: var(--text-muted);
            margin: 0 4px;
            text-transform: uppercase;
        }

        .sod-divider {
            width: 1px;
            height: 32px;
            background: var(--border);
            margin: 0 8px;
            opacity: 0.5;
        }

        /* RIGHT: RPN Summary Card */
        .rpn-summary-card {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-width: 140px;
            height: 56px;
            border-radius: 8px;
            background: rgba(0,0,0,0.03);
            border: 1px solid var(--border);
            position: relative;
            padding: 0 16px;
        }
        
        .rpn-card-title {
            font-size: 0.65rem;
            font-weight: 700;
            color: var(--text-muted);
            letter-spacing: 0.1em;
            position: absolute;
            top: 4px;
            left: 8px;
        }
        
        .rpn-card-value {
            font-size: 1.8rem;
            font-weight: 800;
            line-height: 1;
            color: var(--text-main);
        }

        .rpn-card-status {
            font-size: 0.65rem;
            font-weight: 700;
            text-transform: uppercase;
            position: absolute;
            bottom: 4px;
            right: 8px;
            opacity: 0.8;
        }
        
        /* Status Colors for Card Border/Glow causes issues, keeping it subtle */
        .rpn-summary-card.green { border-color: rgba(16, 185, 129, 0.3); background: rgba(16, 185, 129, 0.05); }
        .rpn-summary-card.green .rpn-card-value { color: var(--success); }
        .rpn-summary-card.green .rpn-card-status { color: var(--success); }

        .rpn-summary-card.yellow { border-color: rgba(245, 158, 11, 0.3); background: rgba(245, 158, 11, 0.05); }
        .rpn-summary-card.yellow .rpn-card-value { color: var(--warning); }
        .rpn-summary-card.yellow .rpn-card-status { color: var(--warning); }

        .rpn-summary-card.red { border-color: rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.05); }
        .rpn-summary-card.red .rpn-card-value { color: var(--danger); }
        .rpn-summary-card.red .rpn-card-status { color: var(--danger); }

        /* Hide standard numbering spinners */
        .rpn-input-group input[type=number]::-webkit-inner-spin-button, 
        .rpn-input-group input[type=number]::-webkit-outer-spin-button { 
          -webkit-appearance: none; 
          margin: 0; 
        }
        .rpn-input-group input[type=number] {
          -moz-appearance: textfield; /* Firefox */
        }

        /* RPN Compact Pill - Integrated Style */
        .rpn-display-pill {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 0 16px;
          height: 48px;
          white-space: nowrap;
          border-left: 1px solid var(--border); /* Divider instead of separate box */
          margin-left: 4px;
        }
        .rpn-display-pill.green { color: var(--success); }
        .rpn-display-pill.yellow { color: var(--warning); }
        .rpn-display-pill.red { color: var(--danger); }

        .rpn-text { font-size: 0.75rem; font-weight: 700; opacity: 0.6; letter-spacing: 0.05em; margin-right: 4px; }
        .rpn-number { font-size: 1.6rem; font-weight: 800; line-height: 1; }
        
        /* SOD Toolbar Group */
        .rpn-top-group {
          display: flex;
          align-items: flex-end; 
          gap: 0; /* Remove gap for toolbar look */
          background: rgba(0,0,0,0.03);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 4px;
        }
        
        /* Override compact field group for top row */
        .rpn-top-group .compact-field-group { 
            width: 60px; 
            position: relative;
        }
        .rpn-top-group .compact-field-group:not(:last-child)::after {
            content: '';
            position: absolute;
            right: 0;
            top: 25%;
            height: 50%;
            width: 1px;
            background: var(--border);
            opacity: 0.5;
        }

        /* Hide standard numbering spinners */
        .rpn-top-group input[type=number]::-webkit-inner-spin-button, 
        .rpn-top-group input[type=number]::-webkit-outer-spin-button { 
          -webkit-appearance: none; 
          margin: 0; 
        }
        .rpn-top-group input[type=number] {
          -moz-appearance: textfield; /* Firefox */
        }

        .rpn-top-group .compact-field-group input { 
            height: 48px; 
            font-size: 1.2rem; 
            width: 100%;
            border: none;
            background: transparent;
            text-align: center;
            color: var(--text-main); /* Force bright text */
            font-weight: 700;
        }
        .rpn-top-group .compact-field-group input:focus {
            background: rgba(0,0,0,0.05);
            border-radius: 4px;
        }

        .rpn-top-group .compact-field-group label {
            font-size: 0.65rem;
            margin-bottom: 0;
            position: absolute;
            top: 2px;
            left: 50%;
            transform: translateX(-50%);
            opacity: 0.5;
            pointer-events: none;
        }
        /* Adjust input padding to make room for label */
        .rpn-top-group .compact-field-group input {
            padding-top: 14px;
        }

        .sod-compact-row {
          display: none; /* Deprecated */
        }

        /* ISO WORKFLOW STYLES */
        .locked-gate { position: relative; }
        .gate-overlay {
            position: absolute;
            inset: 0;
            background: rgba(255, 255, 255, 0.7);
            backdrop-filter: blur(2px);
            z-index: 50;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            font-size: 0.75rem;
            font-weight: 700;
            color: #B45309;
            cursor: pointer;
            gap: 8px;
            border: 1px dashed #F59E0B;
        }
        .gate-overlay:hover { background: rgba(255, 255, 255, 0.8); }

        .justification-panel {
            margin-top: 12px;
            border: 1px solid #E5E7EB;
            border-radius: 8px;
            overflow: hidden;
            background: #F9FAFB;
        }
        .panel-header {
            padding: 8px 12px;
            background: #F3F4F6;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            font-size: 0.75rem;
            font-weight: 600;
        }
        .panel-body { padding: 12px; }
        .justification-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 12px;
            margin-bottom: 8px;
        }
        .just-item label { font-size: 0.65rem; color: #6B7280; font-weight: 700; text-transform: uppercase; display: block; margin-bottom: 4px; }
        .just-item p { font-size: 0.7rem; color: #374151; margin: 0; line-height: 1.4; }
        .audit-note { font-size: 0.65rem; color: #059669; display: flex; align-items: center; gap: 4px; font-weight: 600; margin-top: 8px; }

        .score-advisory-pop {
            position: absolute;
            top: -40px;
            left: 50%;
            transform: translateX(-50%);
            background: #FFFBEB;
            border: 1px solid #F59E0B;
            padding: 4px 8px;
            border-radius: 6px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
            display: flex;
            align-items: center;
            gap: 8px;
            z-index: 60;
            white-space: nowrap;
        }
        .score-advisory-pop span { font-size: 0.7rem; font-weight: 700; color: #92400E; }
        .score-advisory-pop button {
            background: #F59E0B;
            color: white;
            border: none;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.65rem;
            font-weight: 700;
            cursor: pointer;
        }

        .articulation-modal { max-width: 600px !important; }
        .articulation-structure { display: flex; flex-direction: column; gap: 12px; }
        .art-box { background: #F8FAFC; border: 1px solid #E2E8F0; padding: 12px; border-radius: 8px; }
        .art-box label { font-size: 0.65rem; font-weight: 700; color: #64748B; text-transform: uppercase; display: block; margin-bottom: 4px; }
        .art-box p { font-size: 0.85rem; color: #1E293B; margin: 0; font-weight: 500; }
        .input-sm:focus, .textarea-sm:focus { outline: none;  border-color: var(--input-border-focus); background: var(--input-bg-focus); box-shadow: 0 0 0 3px var(--input-focus-ring); }
        .input-sm.disabled { opacity: 0.6; cursor: not-allowed; background: rgba(0,0,0,0.02); }
        .frozen-date {
            background-color: rgba(0,0,0,0.05); /* Slightly darker background */
            color: var(--text-muted); /* Muted text color */
            border-color: rgba(0,0,0,0.08);
        }
        .frozen-date:focus {
            background-color: var(--input-bg); /* Light up on focus to show it's editable */
            color: var(--text-main);
            border-color: var(--primary);
        }

        .textarea-sm { resize: vertical; min-height: 42px; line-height: 1.4; }
        .medium-height { min-height: 80px; }
        .short-height { min-height: 60px; }

        .label-row { display: flex; justify-content: space-between; align-items: center; }
        .magic-link { background: none; border: none; color: var(--primary); font-size: 0.75rem; font-weight: 600; cursor: pointer; opacity: 0.9; }
        .magic-link:hover { opacity: 1; text-decoration: underline; }
        
        .relative-group { position: relative; }
        .btn-smart-icon { 
            position: absolute; 
            bottom: 8px; 
            right: 8px; 
            background: rgba(59, 130, 246, 0.1); 
            border: 1px solid rgba(59, 130, 246, 0.2);
            color: var(--primary); 
            padding: 4px; 
            border-radius: 4px; 
            cursor: pointer; 
            opacity: 0.8; 
            z-index: 10;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .btn-smart-icon:hover { opacity: 1; background: rgba(59, 130, 246, 0.2); }

        /* RISK CONTEXT PANEL & LAYOUT */
        .step-2-layout {
          display: flex;
          gap: 24px;
          align-items: flex-start;
        }
        .left-panel {
          flex: 0 0 45%; /* Increased width to reduce height */
          min-width: 300px;
          position: sticky;
          top: 20px;
        }
        .right-panel {
          flex: 1;
          width: 0; /* Prevents flex child from overflowing */
        }

        .risk-context-panel {
          background: rgba(0, 0, 0, 0.3); /* Slightly darker */
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 14px;
        }
        .context-header {
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(0,0,0,0.05);
        }
        .context-title {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 700;
          color: var(--primary);
          opacity: 0.9;
        }
        
        .context-grid.vertical-grid {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .context-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .context-item label {
          font-size: 0.7rem;
          color: var(--text-muted);
          font-weight: 600;
          text-transform: uppercase;
        }
        .context-item p, .context-item .value-text {
          font-size: 0.85rem;
          color: var(--text-main);
          margin: 0;
          font-weight: 500;
          opacity: 0.95;
          line-height: 1.4;
          font-style: italic;
        }
        .context-item p.truncate {
          display: -webkit-box;
          -webkit-line-clamp: 3; /* Increased from 1 line to 3 */
          -webkit-box-orient: vertical;
          overflow: hidden;
          white-space: normal; /* Allow wrapping */
        }
        .context-item p.truncate-multi {
          display: -webkit-box;
          -webkit-line-clamp: 6; /* Increased from 3 lines to 6 */
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .sod-badge-group {
           display: flex;
           align-items: center;
           gap: 6px;
           font-size: 0.75rem;
           font-weight: 700;
           color: var(--text-main);
           background: rgba(0,0,0,0.05);
           padding: 4px 8px;
           border-radius: 4px;
           border: 1px solid rgba(0,0,0,0.08);
        }
        .sod-badge-group .separator { opacity: 0.3; }

        .rpn-badge-compact {
           font-size: 0.75rem;
           font-weight: 800;
           padding: 4px 8px;
           border-radius: 4px;
           background: rgba(0,0,0,0.08);
           border: 1px solid transparent;
        }
        .rpn-badge-compact.green { color: var(--success); background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.2); }
        .rpn-badge-compact.yellow { color: var(--warning); background: rgba(245, 158, 11, 0.1); border-color: rgba(245, 158, 11, 0.2); }
        .rpn-badge-compact.red { color: var(--danger); background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.2); }

        .rpn-badge-small {
          display: inline-block;
          font-size: 0.7rem;
          padding: 3px 10px;
          border-radius: 12px;
          font-weight: 700;
          background: rgba(0,0,0,0.05);
          color: var(--text-main);
          width: fit-content;
        }
        .rpn-badge-small.green { color: var(--success); background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.2); }
        .rpn-badge-small.yellow { color: var(--warning); background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.2); }
        .rpn-badge-small.red { color: var(--danger); background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.2); }

        @media (max-width: 900px) {
           .step-2-layout { flex-direction: column; }
           .left-panel { width: 100%; flex: none; position: static; margin-bottom: 20px; }
        }

        /* RPN & BADGES */
        .rpn-inline-row {
          display: flex;
          align-items: flex-end;
          gap: 1rem;
          background: rgba(0,0,0,0.03);
          border: 1px solid var(--border);
          padding: 12px;
          border-radius: 6px;
          margin-top: 8px;
        }
        .residual-row { background: rgba(59, 130, 246, 0.05); border-color: rgba(59, 130, 246, 0.2); }

        .rpn-inputs { display: flex; gap: 1rem; }
        .compact-field-group { display: flex; flex-direction: column; gap: 4px; align-items: center; width: 40px; }
        .compact-field-group label { font-size: 0.65rem; text-align: center; }
        .compact-field-group input { text-align: center; padding: 4px; font-weight: 700; height: 32px; }

        .rpn-badge-container {
           margin-left: auto;
           display: flex;
           align-items: center;
           gap: 10px;
           background: var(--form-card-bg);
           padding: 6px 12px;
           border-radius: 20px;
           border: 1px solid var(--border);
        }
        .rpn-label { font-size: 0.75rem; color: var(--text-muted); font-weight: 600; }
        .rpn-value {
          font-size: 1.2rem;
          font-weight: 700;
        }

        .rpn-display-box.green { background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.3); color: #34d399; }
        .rpn-display-box.yellow { background: rgba(245, 158, 11, 0.1); border-color: rgba(245, 158, 11, 0.3); color: #fbbf24; }
        .rpn-display-box.red { background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.3); color: #f87171; }

        .rpn-arrow {
          font-size: 1.25rem;
          color: var(--text-muted);
          opacity: 0;
          visibility: hidden;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          transform: translateX(-10px);
        }
        .rpn-arrow.visible {
          opacity: 1;
          visibility: visible;
          transform: translateX(0);
        }

        .rpn-display-box {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 6px;
          border: 1px solid var(--border);
          min-width: 100px;
          opacity: 0;
          visibility: hidden;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          transform: scale(0.9) translateY(5px);
        }
        .rpn-display-box.visible {
          opacity: 1;
          visibility: visible;
          transform: scale(1) translateY(0);
        }

        .rpn-label {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          opacity: 0.8;
        }

        /* Subtle pop animation on change */
        .rpn-updated {
          transform: scale(1.1);
        }

        .rpn-status {
          font-size: 0.75rem;
          font-weight: 600;
          margin-left: auto;
          text-transform: uppercase;
          display: none;
        }

        /* 1. SEVERITY, OCCURRENCE, DETECTION GRID */
        .sod-rpn-row {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }
        
        .sod-group {
          display: flex;
          gap: 1.5rem;
          background: var(--form-card-bg);
          padding: 8px 16px;
          border-radius: 6px;
          border: 1px solid var(--border);
        }

        .sod-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 90px;
        }

        .sod-item label {
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--text-muted);
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .sod-item input {
          width: 50px;
          height: 42px;
          text-align: center;
          background: rgba(0,0,0,0.05);
          border: 1px solid var(--input-border);
          border-radius: 4px;
          color: var(--text-main);
          font-weight: 600;
          font-size: 1.1rem;
          padding: 4px;
        }
        
        .sod-item input:focus {
          outline: none;
          border-color: var(--primary);
          background: rgba(0,0,0,0.08);
        }

        .sod-item input.error {
          border-color: #ef4444 !important;
          color: #ef4444 !important;
          background: rgba(239, 68, 68, 0.1);
        }

        /* RESTORED MISSING STYLES */
        .badge-pill {
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
        }
        .badge-pill.green { background: rgba(16, 185, 129, 0.2); color: var(--success); }
        .badge-pill.yellow { background: rgba(245, 158, 11, 0.2); color: var(--warning); }
        .badge-pill.red { background: rgba(239, 68, 68, 0.2); color: var(--danger); }

        .form-actions-inline {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 0.5rem;
          padding-top: 0.5rem;
          border-top: 1px solid var(--border);
        }

        .btn-prev {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text-muted);
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          font-size: 0.8rem;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .btn-prev:hover { background: rgba(0,0,0,0.05); color: var(--text-main); }

        .btn-next {
          background: var(--primary);
          border: none;
          color: white;
          padding: 6px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.8rem;
          display: flex;
          align-items: center;
          gap: 4px;
          box-shadow: 0 2px 8px rgba(45, 106, 79, 0.15);
        }
        .btn-next:hover { filter: brightness(1.1); }

        .btn-cancel {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text-muted);
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          font-size: 0.8rem;
        }
        .btn-cancel:hover { background: rgba(0,0,0,0.05); color: var(--text-main); }
        
        .btn-save {
          background: var(--primary);
          border: none;
          color: var(--text-main);
          padding: 8px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 2px 10px rgba(59, 130, 246, 0.4);
        }
        .btn-save:hover { filter: brightness(1.1); }
        .btn-save:disabled { opacity: 0.7; cursor: not-allowed; }

        .stepper-wrapper {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 2rem;
            gap: 1rem;
        }
        .step-item { 
            display: flex; align-items: center; gap: 0.75rem; position: relative; 
            opacity: 0.7; transition: all 0.3s; cursor: pointer;
            padding: 0.5rem 1rem; border-radius: 8px;
        }
        .step-item:hover { background: rgba(0,0,0,0.05); opacity: 1; }
        .step-item.active { opacity: 1; transform: scale(1.05); background: rgba(0,0,0,0.03); }
        .step-item.completed { opacity: 1; }
        
        .step-indicator {
            width: 28px; height: 28px; border-radius: 50%; background: var(--form-card-bg); border: 1px solid var(--border);
            display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700; color: var(--text-muted);
            transition: all 0.3s;
        }
        .active .step-indicator { background: var(--stepper-active); color: #FFF; border-color: var(--stepper-active); box-shadow: 0 0 10px var(--input-focus-ring); }
        .completed .step-indicator { background: var(--success); color: #FFF; border-color: var(--success); }
        .step-label { font-size: 0.85rem; font-weight: 600; color: var(--text-muted); }
        .active .step-label { color: var(--text-main); }
        .completed .step-label { color: #10b981; }

        .step-line { width: 40px; height: 2px; background: var(--stepper-inactive); margin-left: 0.5rem; }
        .completed .step-line { background: #10b981; }

        .animate-fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        /* STEP 3 LAYOUT */
        .step-3-layout {
          display: grid;
          grid-template-columns: 0.7fr 1.3fr;
          gap: 1.5rem;
          align-items: start;
        }
        @media (max-width: 1000px) {
           .step-3-layout { grid-template-columns: 1fr; }
        }

        /* Section Header Layout */
        .section-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          border-bottom: 1px solid var(--border);
          padding-bottom: 0.5rem;
        }

        .section-title.dynamic-title {
          margin: 0;
          border: none;
          padding: 0;
        }

        .header-date-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .header-date-group label {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .input-compact-date {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text-muted);
          font-family: monospace;
          font-size: 0.8rem;
          padding: 2px 6px;
          border-radius: 4px;
        }
        
        .input-compact-date:hover, .input-compact-date:focus {
           color: var(--text-main);
           border-color: var(--primary);
        }

        .input-compact-date.frozen {
          background: rgba(0, 0, 0, 0.05);
          color: var(--text-muted);
          cursor: not-allowed;
          border-color: var(--border);
        }


        /* Residual RPN specific styles */
        .rpn-inline-row {
            display: flex;
            align-items: center;
            gap: 24px;
            background: var(--form-card-bg); /* Unified with Step 1 */
            padding: 12px 16px;
            border-radius: 8px;
            border: 1px solid var(--border); /* Unified border */
            width: 100%;
        }
        
        .rpn-inputs {
            display: flex;
            gap: 1.5rem; /* Increased gap for legibility */
        }

        .compact-field-group {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            min-width: 90px; /* Added min-width to prevent label overlap */
        }

        .compact-field-group label {
            font-size: 0.7rem;
            color: var(--text-muted);
            font-weight: 700;
            text-transform: uppercase;
        }

        .compact-field-group input {
            width: 50px;
            height: 42px; /* Match sod-item height */
            text-align: center;
            background: rgba(0,0,0,0.05);
            border: 1px solid var(--input-border); border-radius: 4px;
            color: var(--text-main);
            font-weight: 600;
        }
        
        .compact-field-group input:focus {
            outline: none;
            border-color: var(--primary);
            background: rgba(0,0,0,0.08);
        }
        
        .compact-field-group input.error {
            border-color: #ef4444;
            color: #ef4444;
            background: rgba(239, 68, 68, 0.1);
        }

        .mt-1 { margin-top: 0.25rem; }
        .inline-block { display: inline-block; }
      `}</style>
    </div >
  );
};

export default RiskForm;
