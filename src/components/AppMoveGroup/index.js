import React, {PureComponent} from 'react';
import {
    Form,
    notification,
    Modal,
    Select} from 'antd';
const FormItem = Form.Item;
const Option = Select.Option;


/*转移到其他应用组*/
@Form.create()
export default class MoveGroup extends PureComponent {
    handleSubmit = (e) => {
        e.preventDefault();
        const {form, currGroupID} = this.props;
        form.validateFields((err, fieldsValue) => {
            if (err) 
                return;
            if (fieldsValue.group_id === currGroupID) {
                notification.warning({message: "不能选择当前所在组"})
                return;
            }
            this.props.onOk(fieldsValue.group_id)
        });
    }
    render() {
        const {getFieldDecorator} = this.props.form;
        const initValue = this.props.currGroupID;
        const groups = this.props.groups || [];
        return (
            <Modal
                title='修改应用所属组'
                visible={true}
                onOk={this.handleSubmit}
                onCancel={this.props.onCancel}>
                <Form onSubmit={this.handleSubmit}>

                    <FormItem label="">
                        {getFieldDecorator('group_id', {
                            initialValue: initValue || '',
                            rules: [
                                {
                                    required: true,
                                    message: '不能为空!'
                                }
                            ]
                        })(
                            <Select>
                                {groups.map((group) => {
                                    return <Option key={group.group_id} value={group.group_id}>{group.group_name}</Option>
                                })}
                            </Select>
                        )}
                    </FormItem>

                </Form>
            </Modal>
        )
    }
}