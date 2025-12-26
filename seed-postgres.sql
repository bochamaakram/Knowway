-- PostgreSQL Seed Data for Supabase
-- Run this in Supabase SQL Editor AFTER schema-postgres.sql

-- Users (password: 123456 - bcrypt hash)
INSERT INTO users (username, email, password, role, points) VALUES
('admin', 'admin@knowway.com', '$2a$10$rDkPvvAFV8kqwevKYqNBNOVnHX7id8JKDj2Z5E5xRJxRJxRJxRJx6', 'super_admin', 5000),
('john_teacher', 'john@knowway.com', '$2a$10$rDkPvvAFV8kqwevKYqNBNOVnHX7id8JKDj2Z5E5xRJxRJxRJxRJx6', 'teacher', 10000),
('sarah_teacher', 'sarah@knowway.com', '$2a$10$rDkPvvAFV8kqwevKYqNBNOVnHX7id8JKDj2Z5E5xRJxRJxRJxRJx6', 'teacher', 10000),
('mike_learner', 'mike@knowway.com', '$2a$10$rDkPvvAFV8kqwevKYqNBNOVnHX7id8JKDj2Z5E5xRJxRJxRJxRJx6', 'learner', 0)
ON CONFLICT (email) DO NOTHING;

-- COURSE 1: JavaScript Fundamentals (FREE)
INSERT INTO courses (id, user_id, title, short_description, description, category, level, is_free, point_cost, points_reward, duration, image_url, status) VALUES
(1, 2, 'JavaScript Fundamentals', 
'Master the core concepts of JavaScript from scratch',
'A comprehensive introduction to JavaScript programming. Learn variables, functions, objects, arrays, and modern ES6+ features.',
'dev', 'beginner', TRUE, 0, 500, 8, 
'https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?w=800', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO course_lessons (course_id, title, content, video_url, order_index) VALUES
(1, 'Introduction to JavaScript', 
'# Welcome to JavaScript!

JavaScript is the programming language of the web.

## What You Will Learn

- Variables and data types
- Functions and scope
- Objects and arrays
- DOM manipulation
- Modern ES6+ features', 
'https://www.youtube.com/watch?v=W6NZfCO5SIk', 1),

(1, 'Variables and Data Types',
'# Variables in JavaScript

Variables are containers for storing data values.

## Declaring Variables

```javascript
let name = "John";
const age = 25;
```

## Data Types

1. **String**: Text values
2. **Number**: Numeric values
3. **Boolean**: true or false
4. **Array**: List of values
5. **Object**: Key-value pairs',
NULL, 2),

(1, 'Functions',
'# Functions in JavaScript

Functions are reusable blocks of code.

```javascript
function greet(name) {
    return "Hello, " + name + "!";
}
```

## Arrow Functions (ES6)

```javascript
const greet = (name) => `Hello, ${name}!`;
```',
NULL, 3);

-- Quiz for JavaScript course
INSERT INTO course_quizzes (id, course_id, title, passing_score) VALUES
(1, 1, 'JavaScript Fundamentals Quiz', 85)
ON CONFLICT (id) DO NOTHING;

INSERT INTO quiz_questions (quiz_id, question, options, correct_index, order_index) VALUES
(1, 'Which keyword is used to declare a constant in JavaScript?', '["var", "let", "const", "define"]', 2, 1),
(1, 'What will console.log(typeof []) output?', '["array", "object", "undefined", "list"]', 1, 2),
(1, 'Which of the following is NOT a JavaScript data type?', '["String", "Boolean", "Float", "Undefined"]', 2, 3),
(1, 'What is the correct syntax for an arrow function?', '["function => {}", "() => {}", "=> function()", "arrow() {}"]', 1, 4),
(1, 'How do you create a comment in JavaScript?', '["<!-- comment -->", "# comment", "// comment", "** comment **"]', 2, 5);

-- COURSE 2: React for Beginners (PAID - 2000 points)
INSERT INTO courses (id, user_id, title, short_description, description, category, level, is_free, point_cost, points_reward, duration, image_url, status) VALUES
(2, 2, 'React for Beginners',
'Build modern user interfaces with React',
'Learn React from the ground up. Understand components, state, props, hooks, and build real-world applications.',
'dev', 'intermediate', FALSE, 2000, 0, 12,
'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO course_lessons (course_id, title, content, video_url, order_index) VALUES
(2, 'What is React?',
'# Introduction to React

React is a JavaScript library for building user interfaces.

## Why React?

- Component-Based
- Declarative
- Learn Once, Write Anywhere',
'https://www.youtube.com/watch?v=Tn6-PIqc4UM', 1),

(2, 'Components and Props',
'# React Components

Components are the building blocks of React applications.

```jsx
function Welcome(props) {
    return <h1>Hello, {props.name}!</h1>;
}
```',
NULL, 2);

-- Quiz for React course
INSERT INTO course_quizzes (id, course_id, title, passing_score) VALUES
(2, 2, 'React Fundamentals Quiz', 85)
ON CONFLICT (id) DO NOTHING;

INSERT INTO quiz_questions (quiz_id, question, options, correct_index, order_index) VALUES
(2, 'What is React primarily used for?', '["Database management", "Building user interfaces", "Server configuration", "File management"]', 1, 1),
(2, 'Which hook is used to manage state?', '["useEffect", "useState", "useContext", "useReducer"]', 1, 2),
(2, 'What is JSX?', '["A database query language", "A CSS preprocessor", "JavaScript syntax extension for React", "A testing framework"]', 2, 3);

-- Reset sequences to match inserted IDs
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
SELECT setval('courses_id_seq', (SELECT MAX(id) FROM courses));
SELECT setval('course_lessons_id_seq', (SELECT MAX(id) FROM course_lessons));
SELECT setval('course_quizzes_id_seq', (SELECT MAX(id) FROM course_quizzes));
SELECT setval('quiz_questions_id_seq', (SELECT MAX(id) FROM quiz_questions));
