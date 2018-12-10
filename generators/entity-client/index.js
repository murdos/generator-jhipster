/**
 * Copyright 2013-2018 the original author or authors from the JHipster project.
 *
 * This file is part of the JHipster project, see https://www.jhipster.tech/
 * for more information.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/* eslint-disable consistent-return */
const chalk = require('chalk');
const _ = require('lodash');
const writeFiles = require('./files').writeFiles;
const utils = require('../utils');
const BaseBlueprintGenerator = require('../generator-base-blueprint');

let useBlueprint;

module.exports = class extends BaseBlueprintGenerator {
    constructor(args, opts) {
        super(args, opts);
        this.context = opts.context;
        utils.copyObjectProps(this, this.options.context);
        const blueprint = this.config.get('blueprint');
        if (!opts.fromBlueprint) {
            // use global variable since getters dont have access to instance property
            useBlueprint = this.composeBlueprint(blueprint, 'entity-client', {
                context: opts.context,
                force: opts.force,
                debug: opts.context.isDebugEnabled,
                'skip-install': opts.context.options['skip-install'],
                'from-cli': opts.context.options['from-cli']
            });
        } else {
            useBlueprint = false;
        }
    }

    // Public API method used by the getter and also by Blueprints
    _configuring() {
        return {
            loadInMemoryData() {
                const context = this.context;

                context.entityFileName = _.kebabCase(context.entityNameCapitalized + _.upperFirst(context.entityAngularJSSuffix));
                context.entityFolderName = this.getEntityFolderName(context.clientRootFolder, context.entityFileName);
                context.entityModelFileName = context.entityFolderName;
                context.entityServiceFileName = context.entityFileName;
                context.entityAngularName = context.entityClass + this.upperFirstCamelCase(context.entityAngularJSSuffix);
                context.entityReactName = context.entityClass + this.upperFirstCamelCase(context.entityAngularJSSuffix);
                context.entityStateName = _.kebabCase(context.entityAngularName);
                context.entityParentPathAddition = this.getEntityParentPathAddition(context.clientRootFolder);
                context.entityUrl = context.entityStateName;
                context.entityTranslationKeyMenu = _.camelCase(
                    context.clientRootFolder ? `${context.clientRootFolder}-${context.entityStateName}` : context.entityStateName
                );

                context.i18nToLoad = [context.entityInstance];
                context.i18nKeyPrefix = `${context.angularAppName}.${context.entityTranslationKey}`;

                // Load in-memory data for fields
                context.fields.forEach(field => {
                    const fieldType = field.fieldType;
                    if (!['Instant', 'ZonedDateTime', 'Boolean'].includes(fieldType)) {
                        context.fieldsIsReactAvField = true;

                        if (field.fieldIsEnum === true) {
                            context.i18nToLoad.push(field.enumInstance);
                        }

                        if (_.isUndefined(field.fieldNameCapitalized)) {
                            field.fieldNameCapitalized = _.upperFirst(field.fieldName);
                        }

                        if (_.isUndefined(field.fieldValidateRulesPatternAngular)) {
                            field.fieldValidateRulesPatternAngular = field.fieldValidateRulesPattern
                                ? field.fieldValidateRulesPattern.replace(/"/g, '&#34;')
                                : field.fieldValidateRulesPattern;
                        }

                        if (_.isUndefined(field.fieldValidateRulesPatternReact)) {
                            field.fieldValidateRulesPatternReact = field.fieldValidateRulesPattern
                                ? field.fieldValidateRulesPattern.replace(/'/g, "\\'")
                                : field.fieldValidateRulesPattern;
                        }
                    }
                });

                // Load in-memory data for relationships
                context.relationships.forEach(relationship => {
                    const otherEntityName = relationship.otherEntityName;
                    const otherEntityData = this.getEntityJson(otherEntityName);
                    if (_.isUndefined(relationship.otherEntityAngularName)) {
                        if (relationship.otherEntityNameCapitalized !== 'User') {
                            const otherEntityAngularSuffix = otherEntityData ? otherEntityData.angularJSSuffix || '' : '';
                            relationship.otherEntityAngularName =
                                _.upperFirst(relationship.otherEntityName) + this.upperFirstCamelCase(otherEntityAngularSuffix);
                        } else {
                            relationship.otherEntityAngularName = 'User';
                        }
                    }
                    if (_.isUndefined(relationship.otherEntityStateName)) {
                        relationship.otherEntityStateName = _.kebabCase(relationship.otherEntityAngularName);
                    }
                    if (_.isUndefined(relationship.otherEntityModuleName)) {
                        if (relationship.otherEntityNameCapitalized !== 'User') {
                            relationship.otherEntityModuleName = `${context.angularXAppName +
                                relationship.otherEntityNameCapitalized}Module`;
                            relationship.otherEntityFileName = _.kebabCase(relationship.otherEntityAngularName);
                            if (context.skipUiGrouping || otherEntityData === undefined || otherEntityData.clientRootFolder === undefined) {
                                relationship.otherEntityClientRootFolder = '';
                            } else {
                                relationship.otherEntityClientRootFolder = `${otherEntityData.clientRootFolder}/`;
                            }
                            if (otherEntityData !== undefined && otherEntityData.clientRootFolder) {
                                if (context.clientRootFolder === otherEntityData.clientRootFolder) {
                                    relationship.otherEntityModulePath = relationship.otherEntityFileName;
                                } else {
                                    relationship.otherEntityModulePath = `${
                                        context.entityParentPathAddition ? `${context.entityParentPathAddition}/` : ''
                                    }${otherEntityData.clientRootFolder}/${relationship.otherEntityFileName}`;
                                }
                                relationship.otherEntityModelName = `${otherEntityData.clientRootFolder}/${
                                    relationship.otherEntityFileName
                                }`;
                                relationship.otherEntityPath = `${otherEntityData.clientRootFolder}/${relationship.otherEntityFileName}`;
                            } else {
                                relationship.otherEntityModulePath = `${
                                    context.entityParentPathAddition ? `${context.entityParentPathAddition}/` : ''
                                }${relationship.otherEntityFileName}`;
                                relationship.otherEntityModelName = relationship.otherEntityFileName;
                                relationship.otherEntityPath = relationship.otherEntityFileName;
                            }
                        } else {
                            relationship.otherEntityModuleName = `${context.angularXAppName}SharedModule`;
                            relationship.otherEntityModulePath = 'app/core';
                        }
                    }
                });
            },
            copyObjectProps() {
                utils.copyObjectProps(this, this.context);
            }
        };
    }

    get configuring() {
        if (useBlueprint) return;
        return this._configuring();
    }

    // Public API method used by the getter and also by Blueprints
    _writing() {
        return writeFiles();
    }

    get writing() {
        if (useBlueprint) return;
        return this._writing();
    }

    // Public API method used by the getter and also by Blueprints
    _end() {
        return {
            end() {
                if (!this.options['skip-install'] && !this.skipClient) {
                    this.rebuildClient();
                }
                this.log(chalk.bold.green(`Entity ${this.entityNameCapitalized} generated successfully.`));
            }
        };
    }

    get end() {
        if (useBlueprint) return;
        return this._end();
    }
};
