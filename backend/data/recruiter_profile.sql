-- Dummy recruiter profile data
CREATE TABLE recruiter_profile (
  id INT PRIMARY KEY,
  name VARCHAR(100),
  company VARCHAR(100)
);
INSERT INTO recruiter_profile (id, name, company) VALUES (1, 'John Doe', 'Acme Corp'), (2, 'Jane Smith', 'Globex');
