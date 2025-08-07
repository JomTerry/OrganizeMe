#!/bin/bash

# 🚀 OrganizeMe GitHub Publisher
# This script helps you publish OrganizeMe to your GitHub account

echo "🎉 OrganizeMe GitHub Publisher"
echo "==============================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "README.md" ]; then
    echo "❌ Error: Please run this script from the OrganizeMe directory"
    exit 1
fi

# Check if git is configured
if [ -z "$(git config user.name)" ] || [ -z "$(git config user.email)" ]; then
    echo "⚙️  Setting up Git configuration..."
    read -p "Enter your name: " git_name
    read -p "Enter your email: " git_email
    git config user.name "$git_name"
    git config user.email "$git_email"
    echo "✅ Git configured!"
    echo ""
fi

# Get GitHub username
echo "📝 GitHub Repository Setup"
echo "-------------------------"
read -p "Enter your GitHub username: " github_username

if [ -z "$github_username" ]; then
    echo "❌ GitHub username is required!"
    exit 1
fi

# Repository details
repo_name="OrganizeMe"
repo_url="https://github.com/$github_username/$repo_name.git"

echo ""
echo "🔍 Repository Details:"
echo "   Username: $github_username"
echo "   Repository: $repo_name"
echo "   URL: $repo_url"
echo ""

# Check if remote already exists
if git remote get-url origin >/dev/null 2>&1; then
    echo "⚠️  Remote 'origin' already exists. Removing it..."
    git remote remove origin
fi

# Add remote
echo "🔗 Adding GitHub remote..."
git remote add origin "$repo_url"

# Show current status
echo ""
echo "📊 Repository Status:"
echo "   Branch: $(git branch --show-current)"
echo "   Commits: $(git rev-list --count HEAD)"
echo "   Files: $(git ls-files | wc -l | tr -d ' ')"
echo ""

# Instructions for manual repository creation
echo "🏗️  MANUAL STEP REQUIRED:"
echo "========================="
echo "1. Go to: https://github.com/new"
echo "2. Repository name: $repo_name"
echo "3. Description: 📋 A comprehensive React Native task management app with priorities, reminders, and modern UI"
echo "4. Make it PUBLIC (recommended)"
echo "5. DO NOT initialize with README, .gitignore, or license"
echo "6. Click 'Create repository'"
echo ""

read -p "✅ Have you created the repository on GitHub? (y/N): " created_repo

if [[ ! "$created_repo" =~ ^[Yy]$ ]]; then
    echo "⏸️  Please create the repository first, then run this script again."
    echo "   Or manually run: git push -u origin main"
    exit 0
fi

# Push to GitHub
echo ""
echo "🚀 Publishing to GitHub..."
if git push -u origin main; then
    echo ""
    echo "🎉 SUCCESS! OrganizeMe is now live on GitHub!"
    echo "=============================================="
    echo ""
    echo "🔗 Your repository: https://github.com/$github_username/$repo_name"
    echo "📱 Clone URL: $repo_url"
    echo ""
    echo "✨ What's included:"
    echo "   ✅ Complete React Native task management app"
    echo "   ✅ TypeScript + SQLite + Modern UI"
    echo "   ✅ Authentication system"
    echo "   ✅ Task priorities and reminders"
    echo "   ✅ Comprehensive documentation"
    echo "   ✅ MIT License"
    echo ""
    echo "🌟 Don't forget to:"
    echo "   • Add topics/tags to your repository"
    echo "   • Enable Issues and Discussions"
    echo "   • Star your own repository"
    echo "   • Share it with the community!"
    echo ""
else
    echo "❌ Failed to push to GitHub."
    echo "   This usually means:"
    echo "   • Repository doesn't exist on GitHub"
    echo "   • Incorrect username or repository name"
    echo "   • Authentication issues"
    echo ""
    echo "💡 Try manually:"
    echo "   git push -u origin main"
fi