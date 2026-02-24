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
    if (formData.severity && formData.occurrence && formData.detection) {
      const rpn = calculateRPN(formData.severity, formData.occurrence, formData.detection);
      const classification = rpn >= 25 ? 'Significant (S)' : 'Acceptable (A)';
      setFormData(prev => ({ ...prev, rpn, risk_classification: classification }));
    }
    if (formData.severity_after && formData.occurrence_after && formData.detection_after) {
      const residual_rpn = calculateRPN(formData.severity_after, formData.occurrence_after, formData.detection_after);
      const residual_classification = residual_rpn >= 25 ? 'Significant (S)' : 'Acceptable (A)';
      setFormData(prev => ({ ...prev, residual_rpn, residual_classification }));
    }
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
    }
  };



  const handleMagicAction = async (field, promptMode) => {
    if (!formData.department_id) {
      alert('Please select a department first.');
      return;
    }
    setMagicLoading(prev => ({ ...prev, [field]: true }));
    try {
      const fd = new FormData();
      fd.append('department_id', formData.department_id);
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
      if (response.data[field]) setFormData(prev => ({ ...prev, [field]: response.data[field] }));
      else if (response.data.rephrased) setFormData(prev => ({ ...prev, [field]: response.data.rephrased }));
      else if (response.data.text) setFormData(prev => ({ ...prev, [field]: response.data.text }));
    } catch (error) {
      console.error("Magic action failed", error);
      if (promptMode === 'REPHRASE' && formData[field]) {
        setFormData(prev => ({ ...prev, [field]: formData[field].replace(/bad/g, 'sub-optimal') }));
      }
    } finally {
      setMagicLoading(prev => ({ ...prev, [field]: false }));
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

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

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 3));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));



  const renderNumericInput = (name, value, label) => (
    <div className="compact-field-group">
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
              onClick={() => setCurrentStep(step.number)}>
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
                    className="input-compact-date"
                  />
                </div>
              </div>

              <div className="compact-grid">

                {/* Conditional Department (Admin Only) */}
                {user?.role === 'admin' && !selectedDepartment && (
                  <div className="field-group">
                    <label>Department</label>
                    <select name="department_id" value={formData.department_id} onChange={handleChange} className="input-sm">
                      <option value="">Select Dept</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                )}

                {/* 1. Requirement / Process Area */}
                <div className="field-group">
                  <label>Requirement / Process Area</label>
                  <input
                    name="requirement_process_area"
                    value={formData.requirement_process_area}
                    onChange={handleChange}
                    className="input-sm"
                    placeholder="e.g. Manufacturing Process"
                  />
                </div>

                {/* 2. Risk Description */}
                <div className="field-group relative-group">
                  <label>Risk Description</label>
                  <textarea
                    name="risk_description"
                    value={formData.risk_description}
                    onChange={handleChange}
                    className="textarea-sm medium-height"
                    placeholder="Describe the risk..."
                  />
                  {!isSinglePage && <SmartAssistButton onClick={handleMagicPrompt} loading={magicLoading.magicPrompt} />}
                </div>

                {/* 3. SOD + RPN (Compact Row) */}
                <div className="sod-rpn-row">
                  <div className="sod-group">
                    <div className="sod-item">
                      <label>Severity</label>
                      <input
                        type="number"
                        name="severity"
                        value={formData.severity}
                        onChange={handleChange}
                        placeholder="-"
                        className={errors.severity ? 'error' : ''}
                      />
                    </div>
                    <div className="sod-item">
                      <label>Occurrence</label>
                      <input
                        type="number"
                        name="occurrence"
                        value={formData.occurrence}
                        onChange={handleChange}
                        placeholder="-"
                        className={errors.occurrence ? 'error' : ''}
                      />
                    </div>
                    <div className="sod-item">
                      <label>Detection</label>
                      <input
                        type="number"
                        name="detection"
                        value={formData.detection}
                        onChange={handleChange}
                        placeholder="-"
                        className={errors.detection ? 'error' : ''}
                      />
                    </div>
                  </div>

                  <div className="rpn-arrow">→</div>

                  <div className={`rpn-display-box ${getRPNData(formData.rpn).color}`}>
                    <span className="rpn-label">RPN:</span>
                    <span className="rpn-value">{formData.rpn}</span>
                  </div>
                </div>

                {/* 4. Potential Failure Mode */}
                <div className="field-group">
                  <label>Potential Failure Mode</label>
                  <textarea
                    name="potential_failure_mode"
                    value={formData.potential_failure_mode}
                    onChange={handleChange}
                    className="textarea-sm short-height"
                  />
                </div>

                {/* 5. Potential Effects */}
                <div className="field-group">
                  <label>Potential Effects</label>
                  <textarea
                    name="potential_effects"
                    value={formData.potential_effects}
                    onChange={handleChange}
                    className="textarea-sm short-height"
                  />
                </div>

                {/* 6. Potential Causes */}
                <div className="field-group">
                  <label>Potential Causes</label>
                  <textarea
                    name="potential_causes"
                    value={formData.potential_causes}
                    onChange={handleChange}
                    className="textarea-sm short-height"
                  />
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
                          className="textarea-sm medium-height"
                          rows={5}
                        />
                        <SmartAssistButton onClick={() => handleMagicAction('current_controls_prevention', 'SUGGEST_CONTROLS')} loading={magicLoading.current_controls_prevention} />
                      </div>
                      <div className="field-group relative-group">
                        <label>Detection Controls</label>
                        <textarea
                          name="current_controls_detection"
                          value={formData.current_controls_detection}
                          onChange={handleChange}
                          className="textarea-sm medium-height"
                          rows={5}
                        />
                        <SmartAssistButton onClick={() => handleMagicAction('current_controls_detection', 'SUGGEST_CONTROLS')} loading={magicLoading.current_controls_detection} />
                      </div>
                    </div>

                    <div className="field-group relative-group">
                      <label>Recommended Actions</label>
                      <textarea name="recommended_actions" value={formData.recommended_actions} onChange={handleChange} className="textarea-sm short-height" />
                      <SmartAssistButton onClick={() => handleMagicAction('recommended_actions', 'REPHRASE')} loading={magicLoading.recommended_actions} />
                    </div>

                    <div className="grid-row cols-2">
                      <div className="field-group">
                        <label>Responsibility Owner</label>
                        <input name="responsibility_owner" value={formData.responsibility_owner} onChange={handleChange} className="input-sm" />
                      </div>
                      <div className="field-group">
                        <label>Target Date</label>
                        <input type="date" name="target_completion_date" value={formData.target_completion_date} onChange={handleChange} className="input-sm" />
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
                        className="textarea-sm medium-height"
                        rows={4}
                      />
                      {!isSinglePage && <SmartAssistButton onClick={() => handleMagicAction('actions_taken', 'REPHRASE')} loading={magicLoading.actions_taken} />}
                    </div>

                    {/* Row 2: Dates & Status (3 Columns) */}
                    <div className="grid-row cols-3">
                      <div className="field-group">
                        <label>Completion Date</label>
                        <input type="date" name="actual_completion_date" value={formData.actual_completion_date} onChange={handleChange} className="input-sm" />
                      </div>
                      <div className="field-group">
                        <label>Review Date</label>
                        <input type="date" name="review_date" value={formData.review_date} onChange={handleChange} className="input-sm" />
                      </div>
                      <div className="field-group">
                        <label>Status</label>
                        <select name="status" value={formData.status} onChange={handleChange} className="input-sm status-select">
                          <option value="Open">Open</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Closed">Closed</option>
                          <option value="Ongoing">Ongoing</option>
                        </select>
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

        {/* Sticky Action Bar */}
        {!isSinglePage && (
          <div className="sticky-action-bar">
            <>
              <button type="button" className="btn-cancel" onClick={() => navigate('/risks')}>Cancel</button>

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
            </>
          </div>
        )}

      </form>

      <style>{`
        :root {
          --bg-dark: #0f172a;
          --bg-card: #1e293b;
          --bg-input: #0f172a;
          --border: #334155;
          --primary: #3b82f6;
          --text-main: #f8fafc;
          --text-muted: #94a3b8;
          --success: #10b981;
          --danger: #ef4444;
          --warning: #f59e0b;
        }

        .risk-page-container {
          max-width: 900px;
          margin: 0 auto;
          color: var(--text-main);
          padding-bottom: 80px; /* Space for sticky footer */
        }

        /* HEADER */
        .risk-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border);
        }
        .header-left { display: flex; align-items: center; gap: 1rem; }
        .back-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; }
        .back-btn:hover { color: white; }
        .header-titles h1 { font-size: 1.25rem; font-weight: 600; margin: 0; letter-spacing: -0.02em; }
        .sub-header-info { font-size: 0.8rem; color: var(--text-muted); font-family: monospace; background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px; }
        .save-status { font-size: 0.75rem; color: var(--success); display: flex; align-items: center; gap: 4px; }

        /* SECTIONS */
        .form-section {
          background: transparent;
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
          background: var(--bg-input);
          border: 1px solid var(--border);
          border-radius: 4px;
          padding: 8px 12px;
          color: white;
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
            background: rgba(255,255,255,0.02);
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
            border: 1px solid rgba(255,255,255,0.05);
        }

        .rpn-input-group input {
            width: 50px;
            height: 48px;
            background: transparent;
            border: none;
            color: white;
            font-size: 1.4rem;
            font-weight: 700;
            text-align: center;
            padding: 0;
        }
        .rpn-input-group input:focus { outline: none; background: rgba(255,255,255,0.05); border-radius: 4px; }
        
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
            background: rgba(255,255,255,0.03);
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
            color: white;
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
          background: rgba(255,255,255,0.03);
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
            color: white; /* Force bright text */
            font-weight: 700;
        }
        .rpn-top-group .compact-field-group input:focus {
            background: rgba(255,255,255,0.05);
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
        .input-sm:focus, .textarea-sm:focus { outline: none; border-color: var(--primary); }
        .input-sm.disabled { opacity: 0.6; cursor: not-allowed; background: rgba(255,255,255,0.02); }
        .frozen-date {
            background-color: rgba(255, 255, 255, 0.05); /* Slightly darker background */
            color: var(--text-muted); /* Muted text color */
            border-color: rgba(255, 255, 255, 0.1);
        }
        .frozen-date:focus {
            background-color: var(--bg-input); /* Light up on focus to show it's editable */
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
          border-bottom: 1px solid rgba(255,255,255,0.05);
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
           color: white;
           background: rgba(255,255,255,0.05);
           padding: 4px 8px;
           border-radius: 4px;
           border: 1px solid rgba(255,255,255,0.1);
        }
        .sod-badge-group .separator { opacity: 0.3; }

        .rpn-badge-compact {
           font-size: 0.75rem;
           font-weight: 800;
           padding: 4px 8px;
           border-radius: 4px;
           background: rgba(255,255,255,0.1);
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
          background: rgba(255,255,255,0.05);
          color: white;
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
          background: rgba(255,255,255,0.03);
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
           background: var(--bg-card);
           padding: 6px 12px;
           border-radius: 20px;
           border: 1px solid var(--border);
        }
        .rpn-label { font-size: 0.75rem; color: var(--text-muted); font-weight: 600; }
        .rpn-value { font-size: 1.1rem; font-weight: 800; color: white; }
        
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

        /* STICKY ACTION BAR */
        .sticky-action-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(10px);
          border-top: 1px solid var(--border);
          padding: 1rem 2rem;
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          z-index: 50;
          box-shadow: 0 -4px 20px rgba(0,0,0,0.5);
        }
        .btn-cancel {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text-muted);
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
        }
        .btn-cancel:hover { background: rgba(255,255,255,0.05); color: white; }
        
        .btn-save {
          background: var(--primary);
          border: none;
          color: white;
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

        .ml-auto { margin-left: auto; }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }

        /* STEPPER */
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
        .step-item:hover { background: rgba(255,255,255,0.05); opacity: 1; }
        .step-item.active { opacity: 1; transform: scale(1.05); background: rgba(255,255,255,0.03); }
        .step-item.completed { opacity: 1; }
        
        .step-indicator {
            width: 28px; height: 28px; border-radius: 50%; background: var(--bg-card); border: 1px solid var(--border);
            display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700; color: var(--text-muted);
            transition: all 0.3s;
        }
        .active .step-indicator { background: var(--primary); color: white; border-color: var(--primary); box-shadow: 0 0 10px rgba(59,130,246,0.5); }
        .completed .step-indicator { background: #10b981; color: white; border-color: #10b981; }
        .step-label { font-size: 0.85rem; font-weight: 600; color: var(--text-muted); }
        .active .step-label { color: white; }
        .completed .step-label { color: #10b981; }

        .step-line { width: 40px; height: 2px; background: var(--border); margin-left: 0.5rem; }
        .completed .step-line { background: #10b981; }

        .btn-prev { background: transparent; color: var(--text-muted); border: 1px solid var(--border); padding: 8px 16px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; font-weight: 600; margin-right: auto; }
        .btn-next { background: var(--primary); color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; font-weight: 600; box-shadow: 0 4px 15px rgba(59,130,246,0.3); }

        .animate-fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }


        /* STEP 3 LAYOUT - COMPACT ENTERPRISE STYLE */
        .step-3-layout {
          display: flex;
          gap: 20px;
          align-items: flex-start;
        }
        .left-summary-panel {
          flex: 0 0 45%; /* Increased width to reduce height */
          min-width: 300px;
        }
        .right-review-panel {
          flex: 1;
        }

        .summary-card {
          background: rgba(15, 23, 42, 0.4);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 6px;
          overflow: hidden;
        }
        .summary-details { width: 100%; }
        
        .summary-toggle {
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.02);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: var(--primary);
          text-transform: uppercase;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          list-style: none;
        }
        .summary-toggle::-webkit-details-marker { display: none; }
        
        .summary-content {
          padding: 16px; /* Increased padding */
          display: flex;
          flex-direction: column;
          gap: 12px; /* Increased gap */
          max-height: 75vh; /* Taller */
          overflow-y: auto;
        }
        
        /* Summary Typography */
        .summary-group { display: flex; flex-direction: column; gap: 2px; margin-bottom: 4px; }
        .summary-group label { font-size: 0.65rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; opacity: 0.7; }
        .summary-group p { font-size: 0.8rem; color: var(--text-main); margin: 0; line-height: 1.3; font-weight: 500; font-style: italic; }
        
        .summary-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        
        .truncate-lines-1 { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
        .truncate-lines-2 { 
           display: -webkit-box;
           -webkit-line-clamp: 4; /* Increased to 4 lines */
           -webkit-box-orient: vertical;
           overflow: hidden; 
           max-height: none; 
        }

        /* Compact Metrics Row */
        .summary-metrics {
           display: flex;
           align-items: center;
           justify-content: space-between;
           gap: 8px;
           background: rgba(255,255,255,0.02);
           padding: 6px 10px;
           border-radius: 4px;
           margin: 4px 0;
           border: 1px solid rgba(255,255,255,0.05);
        }
        .metric-group { display: flex; gap: 8px; align-items: center; }
        .metric { font-size: 0.75rem; font-weight: 700; color: white; display: flex; align-items: center; gap: 3px; }
        .metric span { color: var(--text-muted); font-weight: 500; font-size: 0.7rem; }
        .metric-separator { color: rgba(255,255,255,0.1); }
        
        .summary-divider { height: 1px; background: rgba(255,255,255,0.05); margin: 4px 0; }

        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }

        /* Updated Step 3 Layout */
        .step-3-layout {
          display: grid;
          grid-template-columns: 0.7fr 1.3fr;
          gap: 1.5rem;
          align-items: start;
        }

        .summary-card-header {
          padding: 10px 16px;
          background: rgba(255, 255, 255, 0.03);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .summary-content {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .left-summary-panel {
          width: 100%;
        }

        @media (max-width: 1000px) {
           .step-3-layout { grid-template-columns: 1fr; }
        }

        /* FINAL REFINEMENTS */
        .risk-form-page { gap: 1.2rem; } /* Tighter global spacing */
        
        .step-3-layout .section-title {
           margin-bottom: 0.5rem; /* Reduced from 1rem */
        }
        
        /* Tighter right panel grid */
        .right-review-panel .compact-grid { gap: 1rem; }
        
        .right-review-panel textarea[name="actions_taken"] {
           min-height: 80px;
           height: 80px; /* Explicit height */
        }
        /* RPN New Layout */
        .sod-rpn-row {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }
        
        .sod-group {
          display: flex;
          gap: 1.5rem; /* Increased gap */
          background: var(--bg-card);
          padding: 8px 16px; /* Increased padding */
          border-radius: 6px;
          border: 1px solid var(--border);
        }

        .sod-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 90px; /* Increased to prevent label overlap */
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
          height: 42px; /* Standardize height */
          text-align: center;
          background: rgba(255, 255, 255, 0.05); /* Unified background */
          border: 1px solid var(--border); /* Standardized border */
          border-radius: 4px;
          color: white;
          font-weight: 600;
          font-size: 1.1rem;
          padding: 4px;
        }
        
        .sod-item input:focus {
          outline: none;
          border-color: var(--primary);
          background: rgba(255, 255, 255, 0.1);
        }

        .sod-item input.error {
          border-color: #ef4444 !important;
          color: #ef4444 !important;
          background: rgba(239, 68, 68, 0.1);
        }

        .rpn-arrow {
          color: var(--text-muted);
          font-size: 1.2rem;
          opacity: 0.5;
        }

        .rpn-display-box {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 6px;
          border: 1px solid var(--border);
          min-width: 100px;
        }
        
        .rpn-display-box.green { background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.3); color: #34d399; }
        .rpn-display-box.yellow { background: rgba(245, 158, 11, 0.1); border-color: rgba(245, 158, 11, 0.3); color: #fbbf24; }
        .rpn-display-box.red { background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.3); color: #f87171; }

        .rpn-label {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          opacity: 0.8;
        }

        .rpn-value {
          font-size: 1.2rem;
          font-weight: 700;
        }

        .rpn-status {
          font-size: 0.75rem;
          font-weight: 600;
          margin-left: auto;
          text-transform: uppercase;
          display: none; /* Hidden by default or remove element */
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
           color: white;
           border-color: var(--primary);
        }


        /* Residual RPN specific styles */
        .rpn-inline-row {
            display: flex;
            align-items: center;
            gap: 24px;
            background: var(--bg-card); /* Unified with Step 1 */
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
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--border);
            border-radius: 4px;
            color: white;
            font-weight: 600;
        }
        
        .compact-field-group input:focus {
            outline: none;
            border-color: var(--primary);
            background: rgba(255, 255, 255, 0.1);
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
