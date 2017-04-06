import {Component, OnDestroy, OnInit} from "@angular/core";
import {ActivatedRoute, Router} from "@angular/router";

import {RegisteredApplication} from "windup-services";
import {RegisteredApplicationService} from "./registered-application.service";
import {NotificationService} from "../core/notification/notification.service";
import {utils} from "../shared/utils";
import {WindupExecutionService} from "../services/windup-execution.service";
import {EventBusService} from "../core/events/event-bus.service";
import {
    ExecutionEvent, ApplicationDeletedEvent, UpdateMigrationProjectEvent,
    MigrationProjectEvent
} from "../core/events/windup-event";
import {ExecutionsMonitoringComponent} from "../executions/executions-monitoring.component";
import {MigrationProject} from "windup-services";

@Component({
    templateUrl: './application-list.component.html',
    styleUrls: [
        '../../../css/tables.scss',
        './application-list.component.scss'
    ]
})
export class ApplicationListComponent extends ExecutionsMonitoringComponent implements OnInit, OnDestroy
{
    public filteredApplications: RegisteredApplication[] = [];
    public sortedApplications: RegisteredApplication[] = [];
    public searchText: string;

    constructor(
        private _activatedRoute: ActivatedRoute,
        private _router: Router,
        private _registeredApplicationsService: RegisteredApplicationService,
        private _notificationService: NotificationService,
        _windupExecutionService: WindupExecutionService,
        private _eventBus: EventBusService
    ) {
        super(_windupExecutionService);
    }

    ngOnInit(): any {
        this._eventBus.onEvent
            .filter(event => event.isTypeOf(ExecutionEvent))
            .filter((event: ExecutionEvent) => event.migrationProject.id === this.project.id)
            .subscribe((event: ExecutionEvent) => {
                this.onExecutionEvent(event);
            });

        this._eventBus.onEvent
            .filter(event => event.isTypeOf(ApplicationDeletedEvent))
            .subscribe((event: ApplicationDeletedEvent) => this.onApplicationDeleted(event));

        this._eventBus.onEvent
            .filter(event => event.isTypeOf(UpdateMigrationProjectEvent))
            .filter((event: UpdateMigrationProjectEvent) => event.migrationProject.id === this.project.id)
            .subscribe((event: UpdateMigrationProjectEvent) => this.reloadMigrationProject(event.migrationProject));

        this._activatedRoute.parent.parent.data.subscribe((data: {project: MigrationProject}) => {
            this.reloadMigrationProject(data.project);
        });
    }

    reloadMigrationProject(project: MigrationProject) {
        this.project = project;
        this.filteredApplications = project.applications;
        this.sortedApplications = project.applications;
        this.updateSearch();
    }

    onApplicationDeleted(event: ApplicationDeletedEvent) {
        this.project.applications = this.project.applications.filter(app => {
           return !event.applications.includes(app);
        });
    }

    ngOnDestroy() {
    }

    registerApplication() {
        this._router.navigate([`/projects/${this.project.id}/applications/register`]);
    }

    editApplication(application: RegisteredApplication) {
        this._router.navigate([`/projects/${this.project.id}/applications/${application.id}/edit`]);
    }

    deleteApplication(application: RegisteredApplication) {
        // TODO: Show confirm dialog
        this._registeredApplicationsService.deleteApplication(this.project, application).subscribe(
            () => this._notificationService.success('Application was successfully deleted'),
            error => this._notificationService.error(utils.getErrorMessage(error))
        );
    }

    updateSearch() {
        if (this.searchText && this.searchText.length > 0) {
            this.filteredApplications = this.project.applications.filter(app => app.title.search(new RegExp(this.searchText, 'i')) !== -1);
        } else {
            this.filteredApplications = this.project.applications;
        }
    }
}