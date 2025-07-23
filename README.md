# React Demo Project

This project consists of a React frontend and Django backend for comparing performance run data.

## Prerequisites

- Python 3.x
- Node.js and npm
- Git

## Getting Started

Follow these steps to set up and run the project:

### 1. Activate Python Virtual Environment

```bash
cd perfbackend
source .venv/bin/activate
```

You should see `(.venv)` in your terminal prompt indicating the virtual environment is active.

### 2. Install Python Dependencies

Ensure Django and other required packages are installed:

```bash
pip install django requests
```

### 3. Install Node Dependencies

Open a new terminal window/tab and navigate to the project root:

```bash
cd react-demo
npm install
```

### 4. Start React Frontend

Navigate to the src directory

```bash
cd src
npm start
```

The React app will start on `http://localhost:3000`

### 5. Start Django Backend

In the terminal with the activated virtual environment:

```bash
cd perfbackend
python3 manage.py runserver
```

The Django server will start on `http://localhost:8000`

## Project Structure

```
react-demo/
├── src/                    # React frontend source files
│   ├── App.js
│   ├── RunIdForm.js
│   └── ...
├── perfbackend/            # Django backend
│   ├── manage.py
│   ├── perfdata/
│   └── .venv/             # Python virtual environment
├── package.json            # React dependencies
└── README.md
```

## Usage

1. Open your browser to `http://localhost:3000`
2. Enter two 9-character Run IDs in the form
3. Click "Compare" to fetch and display performance data
4. View the comparison table and charts

## Troubleshooting

- If you get `react-scripts: command not found`, run `npm install` in the react-demo directory
- If you get `ModuleNotFoundError: No module named 'django'`, ensure your virtual environment is activated and run `pip install django`
- If you get `ModuleNotFoundError: No module named 'requests'`, run `pip install requests` in the activated virtual environment
