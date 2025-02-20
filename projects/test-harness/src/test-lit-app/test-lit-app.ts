/* Morgan Stanley makes this available to you under the Apache License,
 * Version 2.0 (the "License"). You may obtain a copy of the License at
 *      http://www.apache.org/licenses/LICENSE-2.0.
 * See the NOTICE file distributed with this work for additional information
 * regarding copyright ownership. Unless required by applicable law or agreed
 * to in writing, software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions
 * and limitations under the License. */

import { getAgent } from '@morgan-stanley/fdc3-web';
import { css, html, LitElement, TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('test-custom-app')
export class TestCustomApp extends LitElement {
    public static styles = css`
        :host {
            background: #0e0e0e;
            color: #f1f1f1;
            display: flex;
            height: 100vh;
            width: 100vw;
            padding: 10px;
        }
    `;

    constructor() {
        super();

        this.setup();
    }

    private async setup(): Promise<void> {
        await getAgent();
    }

    protected render(): TemplateResult {
        return html` Custom Lit App `;
    }
}
