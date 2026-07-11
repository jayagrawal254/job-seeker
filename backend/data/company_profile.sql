-- Dummy company profile data
CREATE TABLE company_profile (
  id INT PRIMARY KEY,
  name VARCHAR(100),
  location VARCHAR(100)
);
INSERT INTO company_profile (id, name, location) VALUES (1, 'Acme Corp', 'New York'), (2, 'Globex', 'San Francisco');
