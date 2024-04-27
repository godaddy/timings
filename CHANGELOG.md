## [2.0.5](https://github.com/godaddy/timings/compare/v2.0.4...v2.0.5) (2024-04-27)


### Bug Fixes

* **node:** lower the min. required node version to 18 ([2f320ed](https://github.com/godaddy/timings/commit/2f320ed1eab332af9d182a82c63cd27c56f749c2))
* **npmrc:** update package-lock to default npm registry ([0e12dbd](https://github.com/godaddy/timings/commit/0e12dbd8867d1b45c309d9899eadf2210200dc9a))


### Code Refactoring

* multiple updates to code and tests ([1b77a3b](https://github.com/godaddy/timings/commit/1b77a3b04258956a856632d85c69999cc6a4e165))
* various updates for elastic 8.x compatibility ([#132](https://github.com/godaddy/timings/issues/132)) ([7771aad](https://github.com/godaddy/timings/commit/7771aadaafeda8cab17135f69344845208624c24))


### CI/CD

* updating cicd workflows ([5ea606f](https://github.com/godaddy/timings/commit/5ea606f24a22700f318f5c520551bd83a8f3c6dd))

## <small>2.0.4 (2022-10-03)</small>

* ci(test): add node 18 to test matrix (#120) ([17bf59e](https://github.com/godaddy/timings/commit/17bf59e)), closes [#120](https://github.com/godaddy/timings/issues/120)
* Add apt-get upgrade -y to Dockerfile ([d7cfeb6](https://github.com/godaddy/timings/commit/d7cfeb6))
* Bump to Node 18.10.0 ([3f6c463](https://github.com/godaddy/timings/commit/3f6c463))
* Merge branch 'main' into FixDockerfile ([997f784](https://github.com/godaddy/timings/commit/997f784))
* Merge pull request #110 from godaddy/FixDockerfile ([eca4f87](https://github.com/godaddy/timings/commit/eca4f87)), closes [#110](https://github.com/godaddy/timings/issues/110)
* Merge pull request #118 from godaddy/BumpNodeTo18 ([81d0d86](https://github.com/godaddy/timings/commit/81d0d86)), closes [#118](https://github.com/godaddy/timings/issues/118)
* Merge pull request #119 from godaddy/BumpNodeTo18 ([2f0ede8](https://github.com/godaddy/timings/commit/2f0ede8)), closes [#119](https://github.com/godaddy/timings/issues/119)
* Switch to slim base image ([5515f25](https://github.com/godaddy/timings/commit/5515f25))

## <small>2.0.3 (2022-10-01)</small>

* refactor(es-init): remove wait-port dependency to check ES status (#117) ([2d2aa99](https://github.com/godaddy/timings/commit/2d2aa99)), closes [#117](https://github.com/godaddy/timings/issues/117)

## <small>2.0.2 (2022-10-01)</small>

* refactor(npm-audit): apply fixes from npm audit (#116) ([8a62813](https://github.com/godaddy/timings/commit/8a62813)), closes [#116](https://github.com/godaddy/timings/issues/116)
* build(sec-updates): update dependencies to address security PRs (#113) ([df6705f](https://github.com/godaddy/timings/commit/df6705f)), closes [#113](https://github.com/godaddy/timings/issues/113)

## <small>2.0.1 (2022-03-25)</small>

* fix(bug_fixes): fix waiting routine for elastic/kibana ([6d01e7e](https://github.com/godaddy/timings/commit/6d01e7e))

## 2.0.0 (2022-03-24)

* build(deps): bump color-string from 1.5.4 to 1.9.0 (#93) ([5f1fb90](https://github.com/godaddy/timings/commit/5f1fb90)), closes [#93](https://github.com/godaddy/timings/issues/93)
* build(npm): missing npm ci command in workflow ([79d2fa0](https://github.com/godaddy/timings/commit/79d2fa0))
* build(snyk): include vulnerability merge ([86cd939](https://github.com/godaddy/timings/commit/86cd939))
* ci(workflows): run test on main also and trigger release ([fde4490](https://github.com/godaddy/timings/commit/fde4490))
* Add pre-release workflow to actions ([47fb004](https://github.com/godaddy/timings/commit/47fb004))
* Delete workflow ([2efcc70](https://github.com/godaddy/timings/commit/2efcc70))
* Merge branch 'master' into main ([41466a4](https://github.com/godaddy/timings/commit/41466a4))
* buil(snyk): package.json & package-lock.json to reduce vulnerabilities (#94) ([61111d4](https://github.com/godaddy/timings/commit/61111d4)), closes [#94](https://github.com/godaddy/timings/issues/94)
* major(es7): ES7 and UI major update (#92) ([f21ed7b](https://github.com/godaddy/timings/commit/f21ed7b)), closes [#92](https://github.com/godaddy/timings/issues/92)

<a name="1.1.5"></a>
## 1.1.5 (2018-01-10)

* 1.1.5 ([d57f8fb](https://github.com/godaddy/timings/commit/d57f8fb))
* Release 1.1.4 ([d380054](https://github.com/godaddy/timings/commit/d380054))
* Release 1.1.5 - updates and fixes ([0a7c13f](https://github.com/godaddy/timings/commit/0a7c13f))



<a name="1.1.4"></a>
## 1.1.4 (2018-01-06)

* 1.1.4 ([ffde0e8](https://github.com/godaddy/timings/commit/ffde0e8))
* Add content-type to resources & waterfall ([7538924](https://github.com/godaddy/timings/commit/7538924))
* Add waterfall filter and KB_REPLACE config setting ([d39cbde](https://github.com/godaddy/timings/commit/d39cbde))
* Config sample set default HTTP port to 80 ([e171596](https://github.com/godaddy/timings/commit/e171596))
* Update documentation & add ES reset in GET /health* endpoint ([44d628a](https://github.com/godaddy/timings/commit/44d628a))
* Updated documentation ([6ad63fa](https://github.com/godaddy/timings/commit/6ad63fa))



<a name="1.1.3"></a>
## 1.1.3 (2018-01-02)

* 1.1.3 ([5c266e8](https://github.com/godaddy/timings/commit/5c266e8))
* Multiple updates & fixes ([6de6397](https://github.com/godaddy/timings/commit/6de6397))



<a name="1.1.2"></a>
## 1.1.2 (2017-12-20)

* 1.1.2 ([a4ba12c](https://github.com/godaddy/timings/commit/a4ba12c))
* Adding image for github documentation ([11b73cf](https://github.com/godaddy/timings/commit/11b73cf))
* Fixed issue with access.log file and fixed documentation errors ([3463428](https://github.com/godaddy/timings/commit/3463428))
* Update config file handling: ([ddad86a](https://github.com/godaddy/timings/commit/ddad86a))
* Update README.md ([a7af9e3](https://github.com/godaddy/timings/commit/a7af9e3))
* Update README.md ([12e0f52](https://github.com/godaddy/timings/commit/12e0f52))



<a name="1.1.1"></a>
## 1.1.1 (2017-12-11)

* 1.1.1 ([c7f9e79](https://github.com/godaddy/timings/commit/c7f9e79))
* Fix issue with waterfall page & parameter validation ([41a25d7](https://github.com/godaddy/timings/commit/41a25d7))



<a name="1.1.0"></a>
# 1.1.0 (2017-12-09)

* 1.1.0 ([9034a38](https://github.com/godaddy/timings/commit/9034a38))
* Updated documentation and swagger docs + adding import script ([9436e38](https://github.com/godaddy/timings/commit/9436e38))



<a name="1.0.9"></a>
## 1.0.9 (2017-12-05)

* 1.0.9 ([833cac6](https://github.com/godaddy/timings/commit/833cac6))
* Bug fix - error with `trim` command when no searchUrl parameter present ([a65a7e1](https://github.com/godaddy/timings/commit/a65a7e1))
* Update dependencies ([eeb8909](https://github.com/godaddy/timings/commit/eeb8909))



<a name="1.0.8"></a>
## 1.0.8 (2017-12-05)

* 1.0.8 ([dfb59f7](https://github.com/godaddy/timings/commit/dfb59f7))
* Updated documentation and parameter validation ([d63fccc](https://github.com/godaddy/timings/commit/d63fccc))
* chore(package): update vulnerable dependencies (#2) ([96a1bbf](https://github.com/godaddy/timings/commit/96a1bbf)), closes [#2](https://github.com/godaddy/timings/issues/2)



<a name="1.0.7"></a>
## 1.0.7 (2017-12-01)

* 1.0.7 ([712fa3a](https://github.com/godaddy/timings/commit/712fa3a))
* Version 1.0.7 - updates ([557ffe7](https://github.com/godaddy/timings/commit/557ffe7))



<a name="1.0.6"></a>
## 1.0.6 (2017-11-16)

* 1.0.6 ([cd02198](https://github.com/godaddy/timings/commit/cd02198))
* Add extra POST body validation & updated ES template ([134256a](https://github.com/godaddy/timings/commit/134256a))
* Adding Basic and SSL auth for elasticsearch ([ae77a1c](https://github.com/godaddy/timings/commit/ae77a1c))



<a name="1.0.5"></a>
## 1.0.5 (2017-11-06)

* 1.0.5 ([bf1d95a](https://github.com/godaddy/timings/commit/bf1d95a))
* Change old parameter `assertRum` to `assertBaseline` ([da40871](https://github.com/godaddy/timings/commit/da40871))



<a name="1.0.4"></a>
## 1.0.4 (2017-11-03)

* 1.0.4 ([08bac4c](https://github.com/godaddy/timings/commit/08bac4c))
* Fix default HTTP port ([ba8afa1](https://github.com/godaddy/timings/commit/ba8afa1))



<a name="1.0.3"></a>
## 1.0.3 (2017-11-03)

* 1.0.3 ([101a35e](https://github.com/godaddy/timings/commit/101a35e))
* Fix links in documentation ([285399f](https://github.com/godaddy/timings/commit/285399f))
* Updates to server config ([d0fe612](https://github.com/godaddy/timings/commit/d0fe612))



<a name="1.0.2"></a>
## 1.0.2 (2017-10-31)

* 1.0.2 ([f99463a](https://github.com/godaddy/timings/commit/f99463a))
* Remove modules option ([c390bfe](https://github.com/godaddy/timings/commit/c390bfe))



<a name="1.0.1"></a>
## 1.0.1 (2017-10-30)

* [fix] s/package/process ([3892460](https://github.com/godaddy/timings/commit/3892460))
* 1.0.1 ([29b9569](https://github.com/godaddy/timings/commit/29b9569))
* Initial ([a27de80](https://github.com/godaddy/timings/commit/a27de80))
* Initial commit ([f254519](https://github.com/godaddy/timings/commit/f254519))
* More updates to documentation ([8f05ff4](https://github.com/godaddy/timings/commit/8f05ff4))
* Small fixes and additions to main documentation ([fb5937a](https://github.com/godaddy/timings/commit/fb5937a))
* Update documentation ([814085f](https://github.com/godaddy/timings/commit/814085f))
* Update readme ([ecc6b6b](https://github.com/godaddy/timings/commit/ecc6b6b))
* Update README.md ([a5d9544](https://github.com/godaddy/timings/commit/a5d9544))
* Update README.md ([d01c0b4](https://github.com/godaddy/timings/commit/d01c0b4))
* Updated documentation ([68c6c06](https://github.com/godaddy/timings/commit/68c6c06))
