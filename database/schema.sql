CREATE TABLE departments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  role ENUM('admin', 'department_user') NOT NULL DEFAULT 'department_user',
  department_id INT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

CREATE TABLE risks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  risk_id VARCHAR(20) NOT NULL UNIQUE,
  department_id INT NOT NULL,
  process_function VARCHAR(200),
  risk_description TEXT NOT NULL,
  potential_failure_mode TEXT,
  potential_effects TEXT,
  severity INT NOT NULL CHECK (severity BETWEEN 1 AND 10),
  potential_causes TEXT,
  current_controls_prevention TEXT,
  occurrence INT NOT NULL CHECK (occurrence BETWEEN 1 AND 10),
  current_controls_detection TEXT,
  detection INT NOT NULL CHECK (detection BETWEEN 1 AND 10),
  rpn INT GENERATED ALWAYS AS (severity * occurrence * detection) STORED,
  risk_classification VARCHAR(50) GENERATED ALWAYS AS (
    CASE
      WHEN (severity * occurrence * detection) >= 27 THEN 'Tracked / Monitored'
      ELSE 'Not Tracked'
    END
  ) STORED,
  recommended_actions TEXT,
  action_status_results TEXT,
  created_by INT NOT NULL,
  updated_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE TABLE risk_reviews (
  id INT PRIMARY KEY AUTO_INCREMENT,
  risk_id INT NOT NULL,
  review_date DATE NOT NULL,
  severity INT CHECK (severity BETWEEN 1 AND 10),
  occurrence INT CHECK (occurrence BETWEEN 1 AND 10),
  detection INT CHECK (detection BETWEEN 1 AND 10),
  rpn INT GENERATED ALWAYS AS (severity * occurrence * detection) STORED,
  notes TEXT,
  reviewed_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (risk_id) REFERENCES risks(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

CREATE TABLE actions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  risk_id INT NOT NULL,
  action_type ENUM('preventive', 'mitigation') NOT NULL,
  action_description TEXT NOT NULL,
  action_owner VARCHAR(100) NOT NULL,
  due_date DATE NOT NULL,
  status ENUM('open', 'in_progress', 'completed', 'overdue') DEFAULT 'open',
  completion_date DATE,
  created_by INT NOT NULL,
  updated_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (risk_id) REFERENCES risks(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE TABLE audit_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INT,
  old_values JSON,
  new_values JSON,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_entity (entity_type, entity_id),
  INDEX idx_user (user_id),
  INDEX idx_created_at (created_at)
);

CREATE INDEX idx_risks_department ON risks(department_id);
CREATE INDEX idx_risks_rpn ON risks(rpn);
CREATE INDEX idx_actions_risk ON actions(risk_id);
CREATE INDEX idx_actions_status ON actions(status);
CREATE INDEX idx_actions_due_date ON actions(due_date);
