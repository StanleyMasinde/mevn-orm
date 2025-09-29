## [unreleased]

### 💼 Other

- Use Node 16 until I figure out what is going on
## [3.2.0] - 2025-09-29

### 🐛 Bug Fixes

- *(deps)* Bump actions/checkout from 4 to 5
- *(deps)* Bump actions/setup-node from 4 to 5

### 💼 Other

- Support the latest versions of node
- Only use Node 20 for tests

### ⚙️ Miscellaneous Tasks

- Upgrade deps
## [3.0.0] - 2025-07-02

### 🐛 Bug Fixes

- *(deps)* Bump actions/checkout from 3 to 4
- *(deps)* Bump actions/setup-node from 3 to 4

### ⚙️ Miscellaneous Tasks

- Upgrade deps
## [2.4.7-1] - 2023-03-08

### ⚙️ Miscellaneous Tasks

- Update the default peer dep
## [2.4.6] - 2023-03-08

### ⚙️ Miscellaneous Tasks

- Add auto publish to npm
## [2.4.5] - 2023-03-06

### 💼 Other

- Update npm dependencies

### ⚙️ Miscellaneous Tasks

- *(ci)* Drop support for node 14
- *(version)* Release patch version  2.4.5
## [2.4.4] - 2023-01-04

### ⚙️ Miscellaneous Tasks

- *(version)* Release patch version  2.4.4
## [2.4.3] - 2023-01-04

### ⚙️ Miscellaneous Tasks

- *(version)* Release patch version  2.4.3
## [2.4.2] - 2023-01-03

### 🐛 Bug Fixes

- *(deps)* Bump actions/checkout from 2 to 3 (#60)

### ⚙️ Miscellaneous Tasks

- *(version)* Release patch version  2.4.2
## [2.4.1] - 2022-07-21

### ⚙️ Miscellaneous Tasks

- *(version)* Release patch  version  2.4.1
## [2.4.0] - 2022-07-20

### ⚙️ Miscellaneous Tasks

- *(version)* Release minor version  2.4.0
## [2.3.7] - 2022-07-20

### 🐛 Bug Fixes

- *(deps)* Bump actions/setup-node from 2 to 3 (#59)
- *(dev)* Throwing error in the init db command that is used for setup

### ⚙️ Miscellaneous Tasks

- *(dev)* The default database in .env.example is now mysql
- *(dev)* Using sqlite 3 instead of @vscode/sqlite3
- *(version)* Release patch  version  2.3.7
## [2.3.6] - 2022-02-03

### 🐛 Bug Fixes

- *(config)* Error when reolving config from the user defined config. file not found
- *(knexfile)* The path of the knex file was still not updated to use either of the 2 .js or .cjs

### ⚙️ Miscellaneous Tasks

- *(version)* Release patch  version  2.3.2
- *(version)* Release patch  version  2.3.3
- *(version)* Release patch  version  2.3.4
- *(version)* Release patch  version  2.3.5
- *(version)* Release patch  version  2.3.6
## [2.3.1] - 2022-02-01

### ⚙️ Miscellaneous Tasks

- *(version)* Release minor version  2.3.1
## [2.3.0] - 2022-02-01

### 🚀 Features

- *(find)* Added the static find method
- *(model)* Added the create method
- *(update)* Added the instance update method
- *(delete)* Added a delete method

### 🐛 Bug Fixes

- *(deps)* Bump knex from 0.21.17 to 0.95.11 (#12)
- *(exports)* Breaking changes were pushed with the previous change. the changes has been fixed
- *(tableName)* Not hiding the table by default
- *(first)* Fixed the first method
- *(knexfile)* Loading knexfile from the current working dir instead of the root of the package
- *(deps)* The latest knex version removed as a peer dep.

### ⚙️ Miscellaneous Tasks

- *(package)* Updated package.json
- *(es6)* Using .cjs for knexfile
- *(version)* Release 2.2.13
- *(version)* Release minor version  2.2.14
- *(version)* Release minor version  2.3.0
