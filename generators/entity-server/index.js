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
const _ = require('lodash');
const jhiCore = require('jhipster-core');
const pluralize = require('pluralize');
const writeFiles = require('./files').writeFiles;
const utils = require('../utils');
const BaseBlueprintGenerator = require('../generator-base-blueprint');

/* constants used throughout */
let useBlueprint;

module.exports = class extends BaseBlueprintGenerator {
    constructor(args, opts) {
        super(args, opts);
        this.context = opts.context;
        utils.copyObjectProps(this, opts.context);
        if (this.databaseType === 'cassandra') {
            this.pkType = 'UUID';
        }
        const blueprint = this.config.get('blueprint');
        if (!opts.fromBlueprint) {
            // use global variable since getters dont have access to instance property
            useBlueprint = this.composeBlueprint(blueprint, 'entity-server', {
                context: opts.context,
                force: opts.force,
                debug: opts.context.isDebugEnabled,
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
                const entityName = context.name;

                context.reactiveRepositories = context.reactive && ['mongodb', 'cassandra', 'couchbase'].includes(context.databaseType);
                context.jhiTablePrefix = this.getTableName(context.jhiPrefix);

                // Load in-memory data for fields
                context.fields.forEach(field => {
                    if (_.isUndefined(field.fieldNameUnderscored)) {
                        field.fieldNameUnderscored = _.snakeCase(field.fieldName);
                    }

                    if (_.isUndefined(field.fieldNameAsDatabaseColumn)) {
                        const fieldNameUnderscored = _.snakeCase(field.fieldName);
                        const jhiFieldNamePrefix = this.getColumnName(context.jhiPrefix);
                        if (jhiCore.isReservedTableName(fieldNameUnderscored, context.databaseType)) {
                            field.fieldNameAsDatabaseColumn = `${jhiFieldNamePrefix}_${fieldNameUnderscored}`;
                        } else {
                            field.fieldNameAsDatabaseColumn = fieldNameUnderscored;
                        }
                    }

                    if (_.isUndefined(field.fieldInJavaBeanMethod)) {
                        // Handle the specific case when the second letter is capitalized
                        // See http://stackoverflow.com/questions/2948083/naming-convention-for-getters-setters-in-java
                        if (field.fieldName.length > 1) {
                            const firstLetter = field.fieldName.charAt(0);
                            const secondLetter = field.fieldName.charAt(1);
                            if (firstLetter === firstLetter.toLowerCase() && secondLetter === secondLetter.toUpperCase()) {
                                field.fieldInJavaBeanMethod = firstLetter.toLowerCase() + field.fieldName.slice(1);
                            } else {
                                field.fieldInJavaBeanMethod = _.upperFirst(field.fieldName);
                            }
                        } else {
                            field.fieldInJavaBeanMethod = _.upperFirst(field.fieldName);
                        }
                    }

                    if (_.isUndefined(field.fieldValidateRulesPatternJava)) {
                        field.fieldValidateRulesPatternJava = field.fieldValidateRulesPattern
                            ? field.fieldValidateRulesPattern.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
                            : field.fieldValidateRulesPattern;
                    }
                });

                // Load in-memory data for relationships
                context.relationships.forEach(relationship => {
                    const jhiTablePrefix = context.jhiTablePrefix;
                    const otherEntityName = relationship.otherEntityName;
                    const otherEntityData = this.getEntityJson(otherEntityName);

                    if (
                        _.isUndefined(relationship.otherEntityRelationshipNamePlural) &&
                        (relationship.relationshipType === 'one-to-many' ||
                            (relationship.relationshipType === 'many-to-many' && relationship.ownerSide === false) ||
                            (relationship.relationshipType === 'one-to-one' && relationship.otherEntityName.toLowerCase() !== 'user'))
                    ) {
                        relationship.otherEntityRelationshipNamePlural = pluralize(relationship.otherEntityRelationshipName);
                    }

                    if (_.isUndefined(relationship.otherEntityRelationshipNameCapitalized)) {
                        relationship.otherEntityRelationshipNameCapitalized = _.upperFirst(relationship.otherEntityRelationshipName);
                    }

                    if (_.isUndefined(relationship.otherEntityRelationshipNameCapitalizedPlural)) {
                        relationship.otherEntityRelationshipNameCapitalizedPlural = pluralize(
                            _.upperFirst(relationship.otherEntityRelationshipName)
                        );
                    }

                    if (otherEntityName === 'user') {
                        relationship.otherEntityTableName = `${jhiTablePrefix}_user`;
                        context.hasUserField = true;
                    } else {
                        relationship.otherEntityTableName = otherEntityData ? otherEntityData.entityTableName : null;
                        if (!relationship.otherEntityTableName) {
                            relationship.otherEntityTableName = this.getTableName(otherEntityName);
                        }
                        if (jhiCore.isReservedTableName(relationship.otherEntityTableName, context.prodDatabaseType)) {
                            const otherEntityTableName = relationship.otherEntityTableName;
                            relationship.otherEntityTableName = `${jhiTablePrefix}_${otherEntityTableName}`;
                        }
                    }
                    context.saveUserSnapshot =
                        context.applicationType === 'microservice' &&
                        context.authenticationType === 'oauth2' &&
                        context.hasUserField &&
                        context.dto === 'no';

                    if (_.isUndefined(relationship.otherEntityRelationshipNamePlural)) {
                        if (relationship.relationshipType === 'many-to-one') {
                            if (otherEntityData && otherEntityData.relationships) {
                                otherEntityData.relationships.forEach(otherRelationship => {
                                    if (
                                        _.upperFirst(otherRelationship.otherEntityName) === entityName &&
                                        otherRelationship.otherEntityRelationshipName === relationship.relationshipName &&
                                        otherRelationship.relationshipType === 'one-to-many'
                                    ) {
                                        relationship.otherEntityRelationshipName = otherRelationship.relationshipName;
                                        relationship.otherEntityRelationshipNamePlural = pluralize(otherRelationship.relationshipName);
                                    }
                                });
                            }
                        }
                    }

                    if (_.isUndefined(relationship.otherEntityNameCapitalizedPlural)) {
                        relationship.otherEntityNameCapitalizedPlural = pluralize(_.upperFirst(relationship.otherEntityName));
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
};
