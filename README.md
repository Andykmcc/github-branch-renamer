# Rename Default Github Branchs

A CLI tool rename and remap one or more default branches in a github repo. Renames X (master) to Y (main), updates /remote/origin/HEAD and updates open PRs base. 

## Requirements
1. [Node.js](https://nodejs.org/en/) installed on you machine.
2. [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git) installed and accessible via the shell.
3. [Personal access tokens] (https://github.com/settings/tokens) can either be and enviroment variable named `GITHUB_TOKEN` or it can be passed when prompted by the CLI. It only needs Repo permissions and can be deleted when you are done with this script. 

## Install
I suggest you use npx since you probably won't need this for long. 
```
npx github-branch-renamer
```
If for some reason you want to persist this tool then use 
```
npm i -g github-branch-renamer
```

## Usage
Run the following command and answer the prompts. 
```
npx github-branch-renamer
```
1. What repos do you want to change? Provide a somma seprated list of HTTPS git urls (e.g `https://github.com/Andykmcc/dotfiles.git,https://github.com/Andykmcc/insure.git`).
2. What is the name of the branch you would like to remove? Default branch to rename is `master`.
3. What would you like to be the name of your new default branch? Default new branch name is `main`.
4. Gitub Personal Access Token, defaults to `process.env.GITHUB_TOKEN`.

## What does it do?

This codebase is meant to get the job done, not be pretty. It relies almost entirely on side effects, hence the lack of tests, and doesn't currently attempt to solve the more complex problems around various authentication methods or unclean working tree. It does the following...

1. Collects the needed information
2. Creates a temp directory for each repo specified and clones it into said directory. 
3. Names X (master) to Y (main).
4. Pushes changes to remote (origin).
5. Updates Github repo default branch to Y (main).
6. Updates open PRs that point to X (master) to they point to Y (main).

