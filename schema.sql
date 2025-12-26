-- Course Management Application Database Schema
-- Run: mysql -u root -proot-pass course_management < schema.sql

DROP TABLE IF EXISTS favorites;
DROP TABLE IF EXISTS purchases;
DROP TABLE IF EXISTS course_lessons;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('super_admin', 'teacher', 'learner') NOT NULL DEFAULT 'learner',
    avatar_url VARCHAR(500),
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE courses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    short_description VARCHAR(500),
    category ENUM('dev', 'design', 'marketing') NOT NULL DEFAULT 'dev',
    duration INT NOT NULL DEFAULT 0,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    discount_price DECIMAL(10, 2) DEFAULT NULL,
    level ENUM('beginner', 'intermediate', 'advanced') NOT NULL DEFAULT 'beginner',
    status ENUM('active', 'archived', 'draft') NOT NULL DEFAULT 'active',
    image_url VARCHAR(500),
    total_lessons INT DEFAULT 0,
    total_students INT DEFAULT 0,
    rating DECIMAL(2, 1) DEFAULT 0.0,
    rating_count INT DEFAULT 0,
    requirements TEXT,
    what_you_learn TEXT,
    who_is_for TEXT,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE favorites (
    user_id INT NOT NULL,
    course_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, course_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE purchases (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    course_id INT NOT NULL,
    price_paid DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    progress INT DEFAULT 0,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_purchase (user_id, course_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE INDEX idx_courses_user_id ON courses(user_id);
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_category ON courses(category);
CREATE INDEX idx_purchases_user_id ON purchases(user_id);

-- Scraped data from n8n
CREATE TABLE scraped_data (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(500),
    content TEXT,
    source_url VARCHAR(1000),
    category VARCHAR(100),
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_scraped_user ON scraped_data(user_id);
CREATE INDEX idx_scraped_category ON scraped_data(category);

-- Course Lessons (parts of a course)
CREATE TABLE course_lessons (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    video_url VARCHAR(500),
    order_index INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE INDEX idx_lessons_course ON course_lessons(course_id);
CREATE INDEX idx_lessons_order ON course_lessons(course_id, order_index);

SELECT 'Schema created successfully!' as message;


