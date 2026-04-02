-- Run this in Azure SQL Query Editor (mac-sql-server / MAC-TASk-MANAGER)
-- If tables already exist, drop them first:
-- DROP TABLE IF EXISTS tasks;
-- DROP TABLE IF EXISTS changelog;

CREATE TABLE tasks (
  id            NVARCHAR(50) PRIMARY KEY,
  user_email    NVARCHAR(255) NOT NULL,
  title         NVARCHAR(500) NOT NULL,
  category      NVARCHAR(50) NOT NULL,
  priority      INT NOT NULL DEFAULT 1,
  status        NVARCHAR(50) NOT NULL DEFAULT 'Not Started',
  duration      NVARCHAR(50) DEFAULT '30m',
  start_time    NVARCHAR(10) DEFAULT '',
  end_time      NVARCHAR(10) DEFAULT '',
  source        NVARCHAR(255) DEFAULT '',
  delegated     NVARCHAR(255) DEFAULT '',
  energy        NVARCHAR(50) DEFAULT '',
  requester     NVARCHAR(255) DEFAULT '',
  received      NVARCHAR(50) DEFAULT '',
  due           NVARCHAR(100) DEFAULT '',
  start_date    NVARCHAR(50) DEFAULT '',
  parent        NVARCHAR(255) DEFAULT '',
  tags          NVARCHAR(255) DEFAULT '',
  waiting       NVARCHAR(255) DEFAULT '',
  nextaction    NVARCHAR(500) DEFAULT '',
  links         NVARCHAR(1000) DEFAULT '',
  notes         NVARCHAR(MAX) DEFAULT '',
  location      NVARCHAR(50) DEFAULT 'notebook',
  calendar_week INT NULL,
  calendar_day  INT NULL,
  calendar_slot INT NULL,
  pending_delegation BIT DEFAULT 0,
  delegated_by  NVARCHAR(255) DEFAULT '',
  created_at    DATETIME2 DEFAULT GETUTCDATE()
);

CREATE INDEX idx_tasks_user ON tasks (user_email);

CREATE TABLE changelog (
  id          INT IDENTITY(1,1) PRIMARY KEY,
  created_at  DATETIME2 DEFAULT GETUTCDATE(),
  user_email  NVARCHAR(255),
  task_id     NVARCHAR(50),
  task_title  NVARCHAR(500),
  action      NVARCHAR(100),
  changes     NVARCHAR(MAX)
);
